const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/require-auth');
const requireRole = require('../middleware/require-role');
const { freshness: freshnessConfig } = require('../config');
const {
  calculateFreshness,
  summarizePropertyFreshness
} = require('../services/freshness-service');

const publicRouter = express.Router();
const ownerRouter = express.Router();
const UNIT_AVAILABILITY_STATUSES = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'CONFIRMATION_REQUIRED'
];

const propertySelect = `
  SELECT p.id, p.owner_id, p.name, p.description, p.property_type, p.rent,
         p.city, p.locality, p.address, p.latitude, p.longitude,
         p.verification_status, p.verification_reason, p.verified_by, p.verified_at,
         p.available, p.sharing, p.gender, p.amenities, p.image_url, p.owner_phone,
         p.availability_confirmed_at, p.created_at, u.name AS owner_name,
         COALESCE(review_summary.rating, 0) AS rating,
         COALESCE(review_summary.review_count, 0) AS review_count,
         latest_verification.id AS verification_id,
         latest_verification.provider AS verification_provider,
         latest_verification.verification_mode,
         latest_verification.status AS verification_result,
         latest_verification.document_type, latest_verification.issuer,
         latest_verification.matching_result, latest_verification.failure_reason,
         latest_verification.verification_date
  FROM properties p
  JOIN users u ON u.id = p.owner_id
  LEFT JOIN (
    SELECT property_id, AVG(rating) AS rating, COUNT(*) AS review_count
    FROM reviews
    WHERE moderation_status = 'PUBLISHED'
    GROUP BY property_id
  ) review_summary ON review_summary.property_id = p.id
  LEFT JOIN (
    SELECT v.id, v.property_id, v.provider, v.verification_mode, v.status,
           v.document_type, v.issuer, v.matching_result, v.failure_reason,
           v.verified_at AS verification_date, v.created_at,
           ROW_NUMBER() OVER (PARTITION BY v.property_id ORDER BY v.id DESC) AS row_num
    FROM property_verifications v
  ) latest_verification
    ON latest_verification.property_id = p.id AND latest_verification.row_num = 1`;

function mapProperty(row) {
  let amenities = row.amenities || [];
  if (typeof amenities === 'string') {
    try {
      amenities = JSON.parse(amenities);
    } catch (error) {
      throw new Error(`Invalid amenities JSON stored for property ${row.id}.`, { cause: error });
    }
  }
  if (!Array.isArray(amenities)) amenities = [];

  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    name: row.name,
    description: row.description,
    propertyType: row.property_type,
    rent: Number(row.rent),
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    city: row.city,
    locality: row.locality,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    available: Boolean(row.available),
    availabilityStatus: row.available ? 'AVAILABLE' : 'OCCUPIED',
    lastConfirmedAt: row.availability_confirmed_at || null,
    sharing: row.sharing,
    gender: row.gender,
    amenities,
    image: row.image_url,
    verification_status: row.verification_status,
    rejection_reason: row.verification_reason,
    verified_at: row.verified_at,
    verified_by: row.verified_by,
    submitted_date: row.created_at,
    verified: row.verification_status === 'VERIFIED',
    units: row.units || [],
    ...(row.verification_id ? {
      digilockerVerification: {
        id: row.verification_id,
        provider: row.verification_provider,
        mode: row.verification_mode,
        status: row.verification_result,
        documentType: row.document_type,
        issuer: row.issuer,
        matchingResult: row.matching_result,
        failureReason: row.failure_reason,
        verifiedAt: row.verification_date
      }
    } : {})
  };
}

function mapUnit(row) {
  return {
    id: row.id,
    propertyId: row.property_id,
    name: row.unit_name,
    availabilityStatus: row.availability_status,
    lastConfirmedAt: row.last_confirmed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateUnitInput(body, { partial = false } = {}) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = [];
  const values = {};

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) {
      errors.push('name must be a non-empty string no longer than 120 characters.');
    } else {
      values.unit_name = input.name.trim();
    }
  } else if (!partial) {
    errors.push('name is required.');
  }

  if (input.availabilityStatus !== undefined) {
    if (typeof input.availabilityStatus !== 'string' ||
        !UNIT_AVAILABILITY_STATUSES.includes(input.availabilityStatus.toUpperCase())) {
      errors.push(`availabilityStatus must be one of: ${UNIT_AVAILABILITY_STATUSES.join(', ')}.`);
    } else {
      values.availability_status = input.availabilityStatus.toUpperCase();
    }
  } else if (!partial) {
    values.availability_status = 'AVAILABLE';
  }

  return { errors, values };
}

async function attachUnits(properties) {
  if (properties.length === 0) return properties;
  const propertyIds = properties.map(property => property.id);
  const placeholders = propertyIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT id, property_id, unit_name, availability_status, last_confirmed_at, created_at, updated_at
     FROM property_units WHERE property_id IN (${placeholders}) ORDER BY property_id, id`,
    propertyIds
  );
  const [reports] = await pool.execute(
    `SELECT property_id, reason
     FROM reports
     WHERE property_id IN (${placeholders})
       AND status IN ('OPEN', 'INVESTIGATING')
       AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)`,
    [...propertyIds, freshnessConfig.mismatchWindowHours]
  );
  const mismatchCounts = new Map(propertyIds.map(id => [String(id), 0]));
  for (const report of reports) {
    if (/already[_\s-]*rented|occupied|availability|not[_\s-]*available|rented[_\s-]*out/i
      .test(report.reason)) {
      const key = String(report.property_id);
      mismatchCounts.set(key, mismatchCounts.get(key) + 1);
    }
  }
  const unitsByProperty = new Map(propertyIds.map(id => [String(id), []]));
  for (const row of rows) {
    const mismatchCount = mismatchCounts.get(String(row.property_id)) || 0;
    const freshness = calculateFreshness({
      availabilityStatus: row.availability_status,
      lastConfirmedAt: row.last_confirmed_at,
      mismatchCount
    });
    unitsByProperty.get(String(row.property_id)).push({ ...mapUnit(row), ...freshness });
  }
  return properties.map(property => {
    const units = unitsByProperty.get(String(property.id)) || [];
    const freshness = summarizePropertyFreshness({
      availabilityStatus: property.availabilityStatus,
      lastConfirmedAt: property.lastConfirmedAt,
      mismatchCount: mismatchCounts.get(String(property.id)) || 0,
      units
    });
    return { ...property, ...freshness, units };
  });
}

function confirmationEventType(status) {
  if (status === 'AVAILABLE') return 'OWNER_CONFIRMED_AVAILABLE';
  if (status === 'OCCUPIED') return 'OWNER_CONFIRMED_OCCUPIED';
  return 'ROOM_AVAILABILITY_UPDATED';
}

function propertyAvailabilityStatus(available) {
  return available ? 'AVAILABLE' : 'OCCUPIED';
}

function validatePropertyInput(body, { partial = false } = {}) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = [];
  const textFields = {
    name: ['name', 180],
    propertyType: ['propertyType', 40],
    city: ['city', 100],
    locality: ['locality', 160],
    address: ['address', 500],
    description: ['description', 10000],
    sharing: ['sharing', 40],
    gender: ['gender', 40],
    image: ['image', 1000],
    ownerPhone: ['ownerPhone', 32]
  };
  const values = {};

  for (const [field, [column, maxLength]] of Object.entries(textFields)) {
    if (input[field] === undefined) {
      if (!partial && ['name', 'propertyType', 'city', 'locality', 'address'].includes(field)) {
        errors.push(`${field} is required.`);
      }
      continue;
    }
    if (typeof input[field] !== 'string' || input[field].trim().length === 0 || input[field].length > maxLength) {
      errors.push(`${field} must be a non-empty string no longer than ${maxLength} characters.`);
      continue;
    }
    values[column] = input[field].trim();
  }

  if (input.rent !== undefined) {
    const rent = Number(input.rent);
    if (!Number.isFinite(rent) || rent <= 0 || rent > 99999999.99) {
      errors.push('rent must be a positive amount.');
    } else {
      values.rent = rent;
    }
  } else if (!partial) {
    errors.push('rent is required.');
  }

  for (const field of ['latitude', 'longitude']) {
    if (input[field] === undefined || input[field] === null || input[field] === '') continue;
    const coordinate = Number(input[field]);
    const bounds = field === 'latitude' ? 90 : 180;
    if (!Number.isFinite(coordinate) || Math.abs(coordinate) > bounds) {
      errors.push(`${field} must be a valid coordinate.`);
    } else {
      values[field] = coordinate;
    }
  }

  if (input.amenities !== undefined) {
    if (!Array.isArray(input.amenities) || input.amenities.length > 50 ||
        input.amenities.some(value => typeof value !== 'string' || value.length > 100)) {
      errors.push('amenities must be an array of up to 50 short strings.');
    } else {
      values.amenities = JSON.stringify(input.amenities.map(value => value.trim()));
    }
  }

  if (input.available !== undefined) {
    if (typeof input.available !== 'boolean') errors.push('available must be a boolean.');
    else values.available = input.available;
  }

  return { errors, values };
}

function buildPropertyFilters(query, { publicOnly = false } = {}) {
  const where = [];
  const parameters = [];
  if (publicOnly) where.push("p.verification_status = 'VERIFIED'");

  const search = typeof query.searchText === 'string'
    ? query.searchText.trim()
    : (typeof query.search === 'string' ? query.search.trim() : '');
  if (search) {
    const pattern = `%${search}%`;
    where.push('(p.name LIKE ? OR p.city LIKE ? OR p.locality LIKE ? OR p.address LIKE ? OR p.property_type LIKE ? OR u.name LIKE ?)');
    parameters.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (typeof query.city === 'string' && !['all', 'All'].includes(query.city)) {
    where.push('p.city = ?');
    parameters.push(query.city);
  }
  if (typeof query.propertyType === 'string' && !['all', 'All'].includes(query.propertyType)) {
    where.push('p.property_type = ?');
    parameters.push(query.propertyType);
  }
  for (const field of ['minRent', 'maxRent']) {
    if (query[field] === undefined || query[field] === '') continue;
    const amount = Number(query[field]);
    if (!Number.isFinite(amount) || amount < 0) {
      const error = new Error(`${field} must be a non-negative amount.`);
      error.status = 400;
      throw error;
    }
    where.push(field === 'minRent' ? 'p.rent >= ?' : 'p.rent <= ?');
    parameters.push(amount);
  }
  if (typeof query.gender === 'string' && !['Any', 'all', 'All'].includes(query.gender)) {
    where.push("(p.gender = ? OR p.gender = 'Any')");
    parameters.push(query.gender);
  }
  if (typeof query.sharing === 'string' && !['Any', 'all', 'All'].includes(query.sharing)) {
    where.push('p.sharing = ?');
    parameters.push(query.sharing);
  }
  if (query.availableNow === 'true' || query.availableNow === '1') {
    where.push(`(
      EXISTS (
        SELECT 1 FROM property_units available_unit
        WHERE available_unit.property_id = p.id
          AND available_unit.availability_status = 'AVAILABLE'
      )
      OR (
        NOT EXISTS (SELECT 1 FROM property_units any_unit WHERE any_unit.property_id = p.id)
        AND p.available = TRUE
      )
    )`);
  }
  if (query.amenities) {
    const amenities = Array.isArray(query.amenities) ? query.amenities : [query.amenities];
    if (amenities.length > 50 || amenities.some(value => typeof value !== 'string')) {
      const error = new Error('amenities must contain up to 50 strings.');
      error.status = 400;
      throw error;
    }
    for (const amenity of amenities) {
      where.push("JSON_CONTAINS(COALESCE(p.amenities, JSON_ARRAY()), JSON_QUOTE(?), '$')");
      parameters.push(amenity);
    }
  }

  const sortBy = {
    'Rent: Low to High': 'p.rent ASC',
    'Rent: High to Low': 'p.rent DESC',
    Rating: 'rating DESC'
  }[query.sortBy] || 'p.created_at DESC';

  return {
    where: where.length ? `WHERE ${where.join(' AND ')}` : '',
    parameters,
    sortBy
  };
}

publicRouter.get('/', async (req, res, next) => {
  try {
    const filters = buildPropertyFilters(req.query, { publicOnly: true });
    const [rows] = await pool.execute(
      `${propertySelect} ${filters.where} ORDER BY ${filters.sortBy}`,
      filters.parameters
    );
    const data = await attachUnits(rows.map(mapProperty));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
});

publicRouter.get('/:id/freshness', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  try {
    const [rows] = await pool.execute(
      `${propertySelect} WHERE p.id = ? AND p.verification_status = 'VERIFIED' LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Property not found.' });
    const [property] = await attachUnits([mapProperty(rows[0])]);
    const { id, availabilityStatus, freshnessScore, freshnessStatus, availabilityConfidence,
      lastConfirmedAt, requiresConfirmation, units } = property;
    return res.json({
      success: true,
      data: {
        id,
        availabilityStatus,
        freshnessScore,
        freshnessStatus,
        availabilityConfidence,
        lastConfirmedAt,
        requiresConfirmation,
        units: units.map(unit => ({
          id: unit.id,
          name: unit.name,
          availabilityStatus: unit.availabilityStatus,
          freshnessScore: unit.freshnessScore,
          freshnessStatus: unit.freshnessStatus,
          availabilityConfidence: unit.availabilityConfidence,
          lastConfirmedAt: unit.lastConfirmedAt,
          requiresConfirmation: unit.requiresConfirmation
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
});

publicRouter.get('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  try {
    const [rows] = await pool.execute(
      `${propertySelect} WHERE p.id = ? AND p.verification_status = 'VERIFIED' LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Property not found.' });
    const [property] = await attachUnits([mapProperty(rows[0])]);
    return res.json({ success: true, data: property });
  } catch (error) {
    return next(error);
  }
});

publicRouter.post('/', requireAuth, requireRole('owner'), async (req, res, next) => {
  const { errors, values } = validatePropertyInput(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const defaults = {
    description: null,
    latitude: null,
    longitude: null,
    available: true,
    sharing: 'Double',
    gender: 'Any',
    amenities: JSON.stringify([]),
    image_url: null,
    owner_phone: null
  };
  const property = { ...defaults, ...values };
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO properties
       (owner_id, name, description, property_type, rent, city, locality, address,
        latitude, longitude, available, sharing, gender, amenities, image_url, owner_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, property.name, property.description, property.property_type,
        property.rent, property.city, property.locality, property.address,
        property.latitude, property.longitude, property.available, property.sharing,
        property.gender, property.amenities, property.image_url, property.owner_phone
      ]
    );
    const status = propertyAvailabilityStatus(property.available);
    await connection.execute(
      `INSERT INTO availability_events
       (property_id, actor_id, event_type, new_status)
       VALUES (?, ?, ?, ?)`,
      [result.insertId, req.user.id, `ROOM_MARKED_${status}`, status]
    );
    const [rows] = await connection.execute(
      `${propertySelect} WHERE p.id = ? LIMIT 1`,
      [result.insertId]
    );
    await connection.commit();
    return res.status(201).json({
      success: true,
      message: 'Property submitted successfully and is awaiting verification.',
      data: mapProperty(rows[0])
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

ownerRouter.use(requireAuth, requireRole('owner'));

ownerRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `${propertySelect} WHERE p.owner_id = ? ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    const data = await attachUnits(rows.map(mapProperty));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
});

ownerRouter.get('/:propertyId/units', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.propertyId)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT pu.id, pu.property_id, pu.unit_name, pu.availability_status,
              pu.last_confirmed_at, pu.created_at, pu.updated_at
       FROM property_units pu
       JOIN properties p ON p.id = pu.property_id
       WHERE p.id = ? AND p.owner_id = ?
       ORDER BY pu.id`,
      [req.params.propertyId, req.user.id]
    );
    const [properties] = await pool.execute(
      'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
      [req.params.propertyId, req.user.id]
    );
    if (!properties[0]) return res.status(404).json({ error: 'Property not found for this owner.' });
    return res.json({ success: true, count: rows.length, data: rows.map(mapUnit) });
  } catch (error) {
    return next(error);
  }
});

ownerRouter.post('/:propertyId/units', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.propertyId)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  const { errors, values } = validateUnitInput(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO property_units
       (property_id, unit_name, availability_status, last_confirmed_at)
       SELECT id, ?, ?, UTC_TIMESTAMP() FROM properties WHERE id = ? AND owner_id = ?`,
      [values.unit_name, values.availability_status, req.params.propertyId, req.user.id]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Property not found for this owner.' });
    }
    const status = values.availability_status;
    await connection.execute(
      `INSERT INTO availability_events
       (property_id, unit_id, actor_id, event_type, new_status)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.propertyId, result.insertId, req.user.id, `ROOM_MARKED_${status}`, status]
    );
    const [rows] = await connection.execute(
      `SELECT id, property_id, unit_name, availability_status, last_confirmed_at, created_at, updated_at
       FROM property_units WHERE id = ?`,
      [result.insertId]
    );
    await connection.commit();
    return res.status(201).json({ success: true, data: mapUnit(rows[0]) });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A unit with this name already exists for the property.' });
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

ownerRouter.patch('/:propertyId/units/:unitId', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.propertyId) || !/^\d+$/.test(req.params.unitId)) {
    return res.status(400).json({ error: 'Property and unit IDs must be positive integers.' });
  }
  const { errors, values } = validateUnitInput(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  if (!Object.keys(values).length) {
    return res.status(400).json({ error: 'Provide a unit name or availability status to update.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [currentRows] = await connection.execute(
      `SELECT pu.id, pu.property_id, pu.unit_name, pu.availability_status
       FROM property_units pu
       JOIN properties p ON p.id = pu.property_id
       WHERE pu.id = ? AND p.id = ? AND p.owner_id = ? FOR UPDATE`,
      [req.params.unitId, req.params.propertyId, req.user.id]
    );
    const current = currentRows[0];
    if (!current) {
      await connection.rollback();
      return res.status(404).json({ error: 'Unit not found for this owner.' });
    }

    const assignments = Object.keys(values).map(field => `\`${field}\` = ?`);
    if (values.availability_status !== undefined) assignments.push('last_confirmed_at = UTC_TIMESTAMP()');
    assignments.push('updated_at = CURRENT_TIMESTAMP');
    const [result] = await connection.execute(
      `UPDATE property_units
       SET ${assignments.join(', ')}
       WHERE id = ? AND property_id = ?`,
      [...Object.values(values), req.params.unitId, req.params.propertyId]
    );
    if (values.availability_status !== undefined) {
      await connection.execute(
        `INSERT INTO availability_events
         (property_id, unit_id, actor_id, event_type, previous_status, new_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.params.propertyId,
          req.params.unitId,
          req.user.id,
          confirmationEventType(values.availability_status),
          current.availability_status,
          values.availability_status
        ]
      );
    }
    const [rows] = await connection.execute(
      `SELECT id, property_id, unit_name, availability_status, last_confirmed_at, created_at, updated_at
       FROM property_units WHERE id = ? AND property_id = ?`,
      [req.params.unitId, req.params.propertyId]
    );
    await connection.commit();
    return res.json({ success: true, data: mapUnit(rows[0]), changed: result.affectedRows > 0 });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

ownerRouter.patch('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  const { errors, values } = validatePropertyInput(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const allowedFields = Object.keys(values);
  if (allowedFields.length === 0) {
    return res.status(400).json({ error: 'Provide at least one valid property field to update.' });
  }

  if (values.available !== undefined) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [currentRows] = await connection.execute(
        'SELECT available FROM properties WHERE id = ? AND owner_id = ? FOR UPDATE',
        [req.params.id, req.user.id]
      );
      if (!currentRows[0]) {
        await connection.rollback();
        return res.status(404).json({ error: 'Property not found for this owner.' });
      }

      const assignments = allowedFields.map(field => `\`${field}\` = ?`);
      assignments.push('availability_confirmed_at = UTC_TIMESTAMP()');
      const [result] = await connection.execute(
        `UPDATE properties SET ${assignments.join(', ')} WHERE id = ? AND owner_id = ?`,
        [...allowedFields.map(field => values[field]), req.params.id, req.user.id]
      );
      const previousStatus = propertyAvailabilityStatus(Boolean(currentRows[0].available));
      const newStatus = propertyAvailabilityStatus(values.available);
      await connection.execute(
        `INSERT INTO availability_events
         (property_id, actor_id, event_type, previous_status, new_status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.params.id,
          req.user.id,
          confirmationEventType(newStatus),
          previousStatus,
          newStatus
        ]
      );
      const [rows] = await connection.execute(
        `${propertySelect} WHERE p.id = ? AND p.owner_id = ? LIMIT 1`,
        [req.params.id, req.user.id]
      );
      await connection.commit();
      return res.json({ success: true, data: mapProperty(rows[0]), changed: result.affectedRows > 0 });
    } catch (error) {
      if (connection) await connection.rollback();
      return next(error);
    } finally {
      connection?.release();
    }
  }

  try {
    const assignments = allowedFields.map(field => `\`${field}\` = ?`).join(', ');
    const [result] = await pool.execute(
      `UPDATE properties SET ${assignments} WHERE id = ? AND owner_id = ?`,
      [...allowedFields.map(field => values[field]), req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      const [rows] = await pool.execute(
        'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
        [req.params.id, req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Property not found for this owner.' });
    }
    const [rows] = await pool.execute(`${propertySelect} WHERE p.id = ? AND p.owner_id = ? LIMIT 1`, [
      req.params.id, req.user.id
    ]);
    return res.json({ success: true, data: mapProperty(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

ownerRouter.delete('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  try {
    const [result] = await pool.execute(
      'DELETE FROM properties WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Property not found for this owner.' });
    return res.json({ success: true, message: 'Property removed successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = {
  publicRouter,
  ownerRouter,
  propertySelect,
  buildPropertyFilters,
  mapProperty,
  validatePropertyInput,
  mapUnit,
  validateUnitInput,
  UNIT_AVAILABILITY_STATUSES
};
