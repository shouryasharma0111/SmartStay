import { requestApi } from './authClient.js';

const LOCAL_PROPERTIES_KEY = 'smartstay_local_properties';
const LOCAL_AUDIT_KEY = 'smartstay_local_property_audit';

function queryString(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }
  const result = params.toString();
  return result ? `?${result}` : '';
}

function localSession(role) {
  let session;
  let accounts;
  try {
    session = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (session?.authMode !== 'local') return null;
    accounts = JSON.parse(localStorage.getItem('smartstay_local_users') || '[]');
  } catch (error) {
    throw new Error(`Unable to read local account data: ${error.message}`);
  }

  const account = Array.isArray(accounts)
    ? accounts.find(user => user.id === session.id && user.role === session.role)
    : null;
  if (!account) throw new Error('This local account is no longer available. Please sign in again.');
  if (role && account.role !== role) {
    const error = new Error('You are not authorized to perform this action.');
    error.status = 403;
    throw error;
  }
  return account;
}

function readLocalProperties() {
  try {
    const properties = JSON.parse(localStorage.getItem(LOCAL_PROPERTIES_KEY) || '[]');
    if (!Array.isArray(properties)) throw new Error('Saved property data is not a list.');
    return properties;
  } catch (error) {
    throw new Error(`Unable to read saved properties: ${error.message}`);
  }
}

function saveLocalProperties(properties) {
  localStorage.setItem(LOCAL_PROPERTIES_KEY, JSON.stringify(properties));
  window.dispatchEvent(new Event('smartstay_properties_updated'));
}

function recordLocalAudit(action, property, reason = '') {
  let logs;
  try {
    logs = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
    if (!Array.isArray(logs)) logs = [];
  } catch (error) {
    console.error('Unable to read local property audit log:', error);
    logs = [];
  }
  logs.unshift({
    id: `local-audit-${Date.now()}`,
    action,
    title: `${action} '${property.name}'`,
    desc: reason,
    time: new Date().toLocaleString(),
    type: action === 'Approve' ? 'approve' : (action === 'Reject' || action === 'Delete' ? 'reject' : 'resolve')
  });
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(logs.slice(0, 100)));
}

function localPropertyFilters(properties, query = {}, { publicOnly = false } = {}) {
  let result = properties.filter(property =>
    !publicOnly || property.verification_status === 'VERIFIED'
  );
  const search = String(query.searchText || query.search || '').trim().toLowerCase();
  if (search) {
    result = result.filter(property =>
      [property.name, property.city, property.locality, property.address, property.propertyType, property.ownerName]
        .some(value => String(value || '').toLowerCase().includes(search))
    );
  }
  if (query.status && query.status !== 'all' && query.status !== 'ALL') {
    result = result.filter(property => property.verification_status === String(query.status).toUpperCase());
  }
  if (query.city && !['all', 'All'].includes(query.city)) {
    result = result.filter(property => property.city === query.city);
  }
  if (query.propertyType && !['all', 'All'].includes(query.propertyType)) {
    result = result.filter(property => property.propertyType === query.propertyType);
  }
  if (query.minRent !== undefined && query.minRent !== null && query.minRent !== '') {
    result = result.filter(property => Number(property.rent) >= Number(query.minRent));
  }
  if (query.maxRent !== undefined && query.maxRent !== null && query.maxRent !== '') {
    result = result.filter(property => Number(property.rent) <= Number(query.maxRent));
  }
  if (query.gender && !['Any', 'all', 'All'].includes(query.gender)) {
    result = result.filter(property => property.gender === query.gender || property.gender === 'Any');
  }
  if (query.sharing && !['Any', 'all', 'All'].includes(query.sharing)) {
    result = result.filter(property => property.sharing === query.sharing);
  }
  if (query.availableNow) {
    result = result.filter(property => Array.isArray(property.units) && property.units.length
      ? property.units.some(unit => unit.availabilityStatus === 'AVAILABLE')
      : property.available);
  }
  const amenities = Array.isArray(query.amenities)
    ? query.amenities
    : (query.amenities ? [query.amenities] : []);
  if (amenities.length) {
    result = result.filter(property => amenities.every(amenity => (property.amenities || []).includes(amenity)));
  }
  if (query.verifiedOnly) {
    result = result.filter(property =>
      property.digilockerVerification?.mode === 'PRODUCTION' &&
      property.digilockerVerification.status === 'VERIFIED'
    );
  }
  if (query.sortBy === 'Rent: Low to High') result.sort((a, b) => a.rent - b.rent);
  if (query.sortBy === 'Rent: High to Low') result.sort((a, b) => b.rent - a.rent);
  if (query.sortBy === 'Rating') result.sort((a, b) => b.rating - a.rating);
  return result;
}

function auditEntry(row) {
  const action = row.action || 'Activity';
  const details = typeof row.details === 'string'
    ? (() => {
        try {
          return JSON.parse(row.details);
        } catch {
          return {};
        }
      })()
    : (row.details || {});
  const actionLabel = action.replace(/^PROPERTY_/, '').replaceAll('_', ' ').toLowerCase();
  return {
    id: row.id,
    action: actionLabel,
    title: `${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(1)} ${row.target_type || 'record'}${row.target_id ? ` #${row.target_id}` : ''}`,
    desc: details.reason || details.name || '',
    time: row.created_at ? new Date(row.created_at).toLocaleString() : '',
    type: action.includes('VERIFIED') || action.includes('APPROVED')
      ? 'approve'
      : (action.includes('REJECT') || action.includes('DELETE') ? 'reject' : 'resolve')
  };
}

export const SmartStayAPI = {
  getProperties(query = {}) {
    if (localSession()) {
      const data = localPropertyFilters(readLocalProperties(), query, { publicOnly: true });
      return Promise.resolve({ success: true, count: data.length, data });
    }
    return requestApi(`/properties${queryString(query)}`);
  },

  getPropertyById(id) {
    if (localSession()) {
      const property = readLocalProperties().find(item =>
        String(item.id) === String(id) && item.verification_status === 'VERIFIED'
      );
      if (!property) {
        const error = new Error('Property not found.');
        error.status = 404;
        return Promise.reject(error);
      }
      return Promise.resolve({ success: true, data: property });
    }
    return requestApi(`/properties/${encodeURIComponent(id)}`);
  },

  getOwnerProperties() {
    const owner = localSession('owner');
    if (owner) {
      const data = readLocalProperties()
        .filter(property => String(property.ownerId) === String(owner.id))
        .map(property => ({ ...property, units: property.units || [] }));
      return Promise.resolve({ success: true, count: data.length, data });
    }
    return requestApi('/owner/properties');
  },

  getOwnerPropertyUnits(propertyId) {
    const owner = localSession('owner');
    if (owner) {
      const property = readLocalProperties().find(item =>
        String(item.id) === String(propertyId) && String(item.ownerId) === String(owner.id)
      );
      if (!property) return Promise.reject(new Error('Property not found for this owner.'));
      const units = Array.isArray(property.units)
        ? property.units.map(unit => ({
            ...unit,
            availabilityStatus: unit.availabilityStatus || unit.availability_status
          }))
        : [];
      return Promise.resolve({ success: true, count: units.length, data: units });
    }
    return requestApi(`/owner/properties/${encodeURIComponent(propertyId)}/units`);
  },

  createOwnerUnit(propertyId, unitData) {
    const owner = localSession('owner');
    if (owner) {
      const properties = readLocalProperties();
      const property = properties.find(item =>
        String(item.id) === String(propertyId) && String(item.ownerId) === String(owner.id)
      );
      if (!property) return Promise.reject(new Error('Property not found for this owner.'));
      const name = typeof unitData.name === 'string' ? unitData.name.trim() : '';
      const availabilityStatus = String(unitData.availabilityStatus || 'AVAILABLE').toUpperCase();
      if (!name || name.length > 120) {
        return Promise.reject(new Error('Enter a unit name up to 120 characters.'));
      }
      if (!['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CONFIRMATION_REQUIRED'].includes(availabilityStatus)) {
        return Promise.reject(new Error('Choose a supported availability status.'));
      }
      property.units = Array.isArray(property.units) ? property.units : [];
      if (property.units.some(unit => unit.name.toLowerCase() === name.toLowerCase())) {
        return Promise.reject(new Error('A unit with this name already exists for the property.'));
      }
      const now = new Date().toISOString();
      const unit = {
        id: `local-unit-${Date.now()}`,
        propertyId: property.id,
        name,
        availabilityStatus,
        createdAt: now,
        updatedAt: now
      };
      property.units.push(unit);
      saveLocalProperties(properties);
      return Promise.resolve({ success: true, data: unit });
    }
    return requestApi(`/owner/properties/${encodeURIComponent(propertyId)}/units`, {
      method: 'POST',
      body: JSON.stringify(unitData)
    });
  },

  updateOwnerUnit(propertyId, unitId, unitData) {
    const owner = localSession('owner');
    if (owner) {
      const properties = readLocalProperties();
      const property = properties.find(item =>
        String(item.id) === String(propertyId) && String(item.ownerId) === String(owner.id)
      );
      const unit = property?.units?.find(item => String(item.id) === String(unitId));
      if (!unit) return Promise.reject(new Error('Unit not found for this owner.'));
      const availabilityStatus = String(unitData.availabilityStatus || '').toUpperCase();
      if (!['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CONFIRMATION_REQUIRED'].includes(availabilityStatus)) {
        return Promise.reject(new Error('Choose a supported availability status.'));
      }
      unit.availabilityStatus = availabilityStatus;
      unit.updatedAt = new Date().toISOString();
      saveLocalProperties(properties);
      return Promise.resolve({ success: true, data: unit });
    }
    return requestApi(
      `/owner/properties/${encodeURIComponent(propertyId)}/units/${encodeURIComponent(unitId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(unitData)
      }
    );
  },

  startDemoVerification(propertyId, outcome = 'MANUAL_REVIEW') {
    const owner = localSession('owner');
    if (owner) {
      if (!['VERIFIED', 'FAILED', 'MANUAL_REVIEW'].includes(outcome)) {
        return Promise.reject(new Error('Choose a supported demo verification result.'));
      }
      const properties = readLocalProperties();
      const property = properties.find(item =>
        String(item.id) === String(propertyId) && String(item.ownerId) === String(owner.id)
      );
      if (!property) return Promise.reject(new Error('This property is not available to your account.'));
      const failureReason = outcome === 'FAILED'
        ? 'Demo scenario: the supplied property and document details do not match.'
        : (outcome === 'MANUAL_REVIEW' ? 'Demo scenario: additional human review is required.' : null);
      property.digilockerVerification = {
        provider: 'SmartStay Local Demo',
        mode: 'DEMO',
        status: outcome,
        documentType: 'Simulated ownership proof',
        issuer: 'Local demo provider',
        matchingResult: outcome === 'VERIFIED' ? 'MATCHED (simulated)' : 'NOT CONFIRMED (simulated)',
        failureReason,
        verifiedAt: outcome === 'VERIFIED' ? new Date().toISOString() : null
      };
      saveLocalProperties(properties);
      return Promise.resolve({ success: true, data: property.digilockerVerification });
    }
    return requestApi(`/digilocker/properties/${encodeURIComponent(propertyId)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ consent: true, demoScenario: outcome })
    });
  },

  createProperty(propertyData) {
    const owner = localSession('owner');
    if (owner) {
      const name = typeof propertyData.name === 'string' ? propertyData.name.trim() : '';
      const rent = Number(propertyData.rent);
      if (!name || !Number.isFinite(rent) || rent <= 0) {
        return Promise.reject(new Error('Add a property name and rent greater than zero.'));
      }
      const property = {
        id: `local-property-${Date.now()}`,
        ownerId: owner.id,
        ownerName: owner.name,
        ownerPhone: propertyData.ownerPhone || '',
        name,
        description: propertyData.description || '',
        propertyType: propertyData.propertyType || 'PG',
        rent,
        city: propertyData.city || 'Ghaziabad',
        locality: propertyData.locality || 'Near ABES Engineering College',
        address: propertyData.address || `${propertyData.locality || 'Near ABES Engineering College'}, ${propertyData.city || 'Ghaziabad'}`,
        latitude: Number(propertyData.latitude) || null,
        longitude: Number(propertyData.longitude) || null,
        available: true,
        sharing: propertyData.sharing || 'Double',
        gender: propertyData.gender || 'Any',
        amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities : [],
        image: propertyData.image || '',
        rating: 0,
        verification_status: 'PENDING',
        rejection_reason: null,
        verified_at: null,
        verified_by: null,
        verified: false,
        units: [],
        submitted_date: new Date().toISOString()
      };
      saveLocalProperties([property, ...readLocalProperties()]);
      return Promise.resolve({
        success: true,
        message: 'Property saved on this device and is awaiting verification.',
        data: property
      });
    }
    return requestApi('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData)
    });
  },

  updateOwnerProperty(propertyId, propertyData) {
    const owner = localSession('owner');
    if (owner) {
      const properties = readLocalProperties();
      const property = properties.find(item =>
        String(item.id) === String(propertyId) && String(item.ownerId) === String(owner.id)
      );
      if (!property) return Promise.reject(new Error('Property not found for this owner.'));
      if (propertyData.rent !== undefined) {
        const rent = Number(propertyData.rent);
        if (!Number.isFinite(rent) || rent <= 0) {
          return Promise.reject(new Error('Rent must be greater than zero.'));
        }
        property.rent = rent;
      }
      saveLocalProperties(properties);
      return Promise.resolve({ success: true, data: property });
    }
    return requestApi(`/owner/properties/${encodeURIComponent(propertyId)}`, {
      method: 'PATCH',
      body: JSON.stringify(propertyData)
    });
  },

  deleteOwnerProperty(propertyId) {
    const owner = localSession('owner');
    if (owner) {
      const properties = readLocalProperties();
      const remaining = properties.filter(property =>
        !(String(property.id) === String(propertyId) && String(property.ownerId) === String(owner.id))
      );
      if (remaining.length === properties.length) {
        return Promise.reject(new Error('Property not found for this owner.'));
      }
      saveLocalProperties(remaining);
      return Promise.resolve({ success: true, message: 'Property removed successfully.' });
    }
    return requestApi(`/owner/properties/${encodeURIComponent(propertyId)}`, {
      method: 'DELETE'
    });
  },

  getAdminProperties(query = {}) {
    if (localSession('admin')) {
      const all = readLocalProperties();
      const data = localPropertyFilters(all, query);
      return Promise.resolve({
        success: true,
        total: all.length,
        pendingCount: all.filter(property => property.verification_status === 'PENDING').length,
        verifiedCount: all.filter(property => property.verification_status === 'VERIFIED').length,
        rejectedCount: all.filter(property => property.verification_status === 'REJECTED').length,
        data
      });
    }
    return requestApi(`/admin/properties${queryString(query)}`);
  },

  async updateDigiLockerVerification(propertyId, status, reason = '') {
    const admin = localSession('admin');
    if (admin) {
      const properties = readLocalProperties();
      const property = properties.find(item =>
        String(item.id) === String(propertyId) && item.digilockerVerification
      );
      if (!property) {
        const error = new Error('Verification record not found.');
        error.status = 404;
        throw error;
      }
      property.digilockerVerification.status = status;
      property.digilockerVerification.failureReason = reason || null;
      property.digilockerVerification.matchingResult = status === 'VERIFIED'
        ? 'ADMIN_REVIEWED (local demo)'
        : 'NOT CONFIRMED (local demo)';
      property.digilockerVerification.verifiedAt = status === 'VERIFIED' ? new Date().toISOString() : null;
      saveLocalProperties(properties);
      recordLocalAudit(`DigiLocker ${status}`, property, reason);
      return { success: true, data: property.digilockerVerification };
    }
    const properties = await this.getAdminProperties();
    const verificationId = properties.data
      ?.find(property => String(property.id) === String(propertyId))
      ?.digilockerVerification?.id;
    if (!verificationId) {
      const error = new Error('Verification record not found.');
      error.status = 404;
      throw error;
    }
    return requestApi(`/admin/verifications/${encodeURIComponent(verificationId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    });
  },

  async updateVerificationStatus(propertyId, payload) {
    const admin = localSession('admin');
    if (admin) {
      const properties = readLocalProperties();
      const property = properties.find(item => String(item.id) === String(propertyId));
      if (!property) throw new Error('Property not found.');
      if (!['VERIFIED', 'REJECTED'].includes(payload.status)) {
        throw new Error('Invalid verification status.');
      }
      if (payload.status === 'REJECTED' && !String(payload.reason || '').trim()) {
        throw new Error('A reason is required when rejecting a property.');
      }
      property.verification_status = payload.status;
      property.rejection_reason = payload.status === 'REJECTED'
        ? String(payload.reason).trim()
        : null;
      property.verified_at = new Date().toISOString();
      property.verified_by = admin.id;
      property.verified = payload.status === 'VERIFIED';
      saveLocalProperties(properties);
      recordLocalAudit(payload.status === 'VERIFIED' ? 'Approve' : 'Reject', property, property.rejection_reason || '');
      return {
        success: true,
        message: payload.status === 'VERIFIED' ? 'Property verified successfully.' : 'Property rejected successfully.',
        data: property
      };
    }
    const result = await requestApi(`/admin/properties/${encodeURIComponent(propertyId)}/verification`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return {
      ...result,
      success: true,
      message: result.data?.verificationStatus === 'VERIFIED'
        ? 'Property verified successfully.'
        : 'Property rejected successfully.'
    };
  },

  deleteProperty(propertyId) {
    const admin = localSession('admin');
    if (admin) {
      const properties = readLocalProperties();
      const property = properties.find(item => String(item.id) === String(propertyId));
      if (!property) return Promise.reject(new Error('Property not found.'));
      saveLocalProperties(properties.filter(item => String(item.id) !== String(propertyId)));
      recordLocalAudit('Delete', property);
      return Promise.resolve({ success: true, message: 'Property deleted successfully.' });
    }
    return requestApi(`/admin/properties/${encodeURIComponent(propertyId)}`, {
      method: 'DELETE'
    });
  },

  async getAuditLogs() {
    if (localSession('admin')) {
      try {
        const logs = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
        return Array.isArray(logs) ? logs : [];
      } catch (error) {
        throw new Error(`Unable to read local property audit log: ${error.message}`);
      }
    }
    const result = await requestApi('/admin/audit-logs');
    return (result.data || []).map(auditEntry);
  }
};
