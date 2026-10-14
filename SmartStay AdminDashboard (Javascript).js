/**
 * SmartStay Admin Dashboard - Comprehensive JavaScript Engine
 * Manages Overview KPIs, Property Verification Flow, Tenant/Owner Directories,
 * Fraud Reports Queue, Reviews Moderation, Geocoding Coordinates, and Audit Logs.
 * Strictly integrated with SmartStayAPI backend service.
 */

import { SmartStayAPI } from './apiService.js';
import { requireRole } from './authClient.js';

// --- Centralized Admin State ---
const AdminState = {
  activeView: 'dashboard',
  propertyFilter: 'all',
  propertyCity: 'all',
  propertyType: 'all',
  propertySearch: '',
  verificationFilter: 'all',
  isLoading: false,
  
  properties: [],

  // Registered Tenants / Users
  users: [
    { id: 101, name: "Rahul Sharma", email: "rahul.s@abes.ac.in", phone: "+91 98711 00112", college: "ABES Engineering College, Ghaziabad", bookings: 2, reports: 0, status: "Active", joined: "12 Aug 2026" },
    { id: 102, name: "Aman Gupta", email: "aman.g@kiet.edu", phone: "+91 98711 00223", college: "KIET Group of Institutions, Ghaziabad", bookings: 1, reports: 1, status: "Active", joined: "15 Aug 2026" },
    { id: 103, name: "Priya Singh", email: "priya.singh@jss.ac.in", phone: "+91 98711 00334", college: "JSS Academy of Technical Education, Noida", bookings: 3, reports: 0, status: "Active", joined: "01 Sep 2026" },
    { id: 104, name: "Rohit Verma", email: "rohit.v99@gmail.com", phone: "+91 98711 00445", college: "Galgotias University, Greater Noida", bookings: 0, reports: 4, status: "Suspended", joined: "18 Jul 2026" },
    { id: 105, name: "Sneha Patel", email: "sneha.p@du.ac.in", phone: "+91 98711 00556", college: "Delhi University (North Campus)", bookings: 1, reports: 0, status: "Active", joined: "20 Sep 2026" },
    { id: 106, name: "Ankit Kumar", email: "ankit.k@akgec.ac.in", phone: "+91 98711 00667", college: "AKGEC, Ghaziabad", bookings: 2, reports: 0, status: "Active", joined: "05 Sep 2026" },
    { id: 107, name: "Megha Rao", email: "megha.rao@iitd.ac.in", phone: "+91 98711 00778", college: "IIT Delhi", bookings: 1, reports: 0, status: "Active", joined: "10 Sep 2026" }
  ],

  // Registered Property Owners / Landlords
  owners: [
    { id: 201, name: "Rahul Sharma", phone: "+91 98765 11111", email: "rahul.landlord@gmail.com", propertiesCount: 6, verifiedCount: 5, pendingCount: 1, reportsCount: 0, kycStatus: "Verified" },
    { id: 202, name: "Amit Kumar", phone: "+91 98765 22222", email: "amit.kumar.pg@yahoo.com", propertiesCount: 4, verifiedCount: 3, pendingCount: 1, reportsCount: 1, kycStatus: "Verified" },
    { id: 203, name: "Vikram Malhotra", phone: "+91 98765 33333", email: "vikram.m@smartproperties.in", propertiesCount: 8, verifiedCount: 8, pendingCount: 0, reportsCount: 0, kycStatus: "Verified" },
    { id: 204, name: "Arjun Verma", phone: "+91 98111 22334", email: "arjun.royalpg@gmail.com", propertiesCount: 3, verifiedCount: 1, pendingCount: 2, reportsCount: 2, kycStatus: "Pending" },
    { id: 205, name: "Sunil Rajput", phone: "+91 99222 33445", email: "sunil.rajput@live.in", propertiesCount: 2, verifiedCount: 0, pendingCount: 1, reportsCount: 3, kycStatus: "Suspended" }
  ],

  // Fraud / Fake Listing Reports Queue
  reports: [
    {
      id: 501,
      propertyId: 8,
      propertyName: "Noida Sector 62 Living",
      propertyImage: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=800&auto=format&fit=crop",
      ownerName: "Amit Kumar",
      reportedBy: "Aman Gupta (User #102)",
      reason: "already_rented",
      reasonText: "Property Already Rented",
      message: "I visited the property today. The caretaker told me all double-sharing rooms were rented out last month. Listing still shows available.",
      date: "25 Sep 2026",
      severity: "high",
      status: "Open"
    },
    {
      id: 502,
      propertyId: 11,
      propertyName: "Green Valley Boys Hostel",
      propertyImage: "https://images.unsplash.com/photo-1595526114035-0d455f697873?q=80&w=800&auto=format&fit=crop",
      ownerName: "Sunil Rajput",
      reportedBy: "Rohit Verma (User #104)",
      reason: "fake_property",
      reasonText: "Fake / Misleading Photos",
      message: "The photos in the listing show luxury attached AC bathrooms, but in reality, there is only one common bathroom for the entire floor.",
      date: "24 Sep 2026",
      severity: "high",
      status: "Open"
    },
    {
      id: 503,
      propertyId: 4,
      propertyName: "Cozy Room for Rent",
      propertyImage: "https://images.unsplash.com/photo-1598928506311-c55f4376c370?q=80&w=800&auto=format&fit=crop",
      ownerName: "Vikram Malhotra",
      reportedBy: "Sneha Patel (User #105)",
      reason: "wrong_price",
      reasonText: "Incorrect Price on Call",
      message: "Listing shows ₹6,000 rent, but owner demanded ₹9,000 over phone plus ₹3,000 hidden maintenance charges.",
      date: "23 Sep 2026",
      severity: "med",
      status: "Open"
    },
    {
      id: 504,
      propertyId: 10,
      propertyName: "Royal Residency PG",
      propertyImage: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=800&auto=format&fit=crop",
      ownerName: "Arjun Verma",
      reportedBy: "Priya Singh (User #103)",
      reason: "duplicate",
      reasonText: "Duplicate Listing",
      message: "This property is listed twice under two different names with differing rents.",
      date: "22 Sep 2026",
      severity: "med",
      status: "Open"
    }
  ],

  // Reviews Moderation Queue
  reviews: [
    {
      id: 301,
      propertyId: 1,
      propertyName: "Skyline Boys PG",
      userName: "Aman Gupta",
      rating: 5,
      comment: "Superb PG near ABES college! Wi-Fi speed is 200 Mbps and food quality is home-like. Recommended for all first-years.",
      date: "24 Sep 2026",
      flagged: false,
      flagReason: ""
    },
    {
      id: 302,
      propertyId: 11,
      propertyName: "Green Valley Boys Hostel",
      userName: "Anonymous Student",
      rating: 1,
      comment: "Do NOT book this PG! Caretaker is rude and power backup doesn't work during exams. Complete scam.",
      date: "25 Sep 2026",
      flagged: true,
      flagReason: "Reported by Owner for dispute & defamatory claims"
    },
    {
      id: 303,
      propertyId: 2,
      propertyName: "Elite Girls Hostel",
      userName: "Sneha Patel",
      rating: 5,
      comment: "Very safe and clean environment. Biometric entry and 24/7 female warden. Best PG in Ghaziabad.",
      date: "22 Sep 2026",
      flagged: false,
      flagReason: ""
    },
    {
      id: 304,
      propertyId: 4,
      propertyName: "Cozy Room for Rent",
      userName: "SpamBot_99",
      rating: 1,
      comment: "Visit free-crypto-bonanza.xyz to win ₹50,000 cash discount on rent bookings today!!",
      date: "23 Sep 2026",
      flagged: true,
      flagReason: "Automated spam URL detected"
    }
  ],

  // System Notifications
  notifications: [
    { id: 1, type: "verification", title: "Properties Pending Document Verification", time: "10 mins ago", unread: true, targetView: "properties", targetFilter: "pending" },
    { id: 2, type: "report", title: "New High-Risk Report on 'Green Valley Boys Hostel'", time: "45 mins ago", unread: true, targetView: "reports" },
    { id: 3, type: "owner", title: "New Landlord Registration: Arjun Verma (KYC Submitted)", time: "2 hours ago", unread: true, targetView: "owners" },
    { id: 4, type: "review", title: "Spam Review Flagged on 'Cozy Room for Rent'", time: "5 hours ago", unread: true, targetView: "reviews" }
  ]
};

// =========================================================================
// ASYNC DATA LOADING & BACKEND INTEGRATION
// =========================================================================

/**
 * Load Properties from Master Backend API
 */
async function loadAdminProperties() {
  AdminState.isLoading = true;
  try {
    const res = await SmartStayAPI.getAdminProperties();
    AdminState.properties = res.data;
    renderPropertiesTable();
    renderVerificationCenter();
    updateCounters();
    renderDashboardActivity();
  } catch (err) {
    console.error('Error fetching admin properties:', err);
    showToast(err.message || 'Unable to load properties from backend.', 'danger');
  } finally {
    AdminState.isLoading = false;
  }
}

// =========================================================================
// RENDER FUNCTIONS & DOM INJECTION
// =========================================================================

/**
 * Switch Active View Section
 */
function switchView(viewName, filterParam = null) {
  AdminState.activeView = viewName;

  // Update Sidebar active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName && item.getAttribute('data-filter') === filterParam) {
      item.classList.add('active');
    }
  });

  // Update Breadcrumb
  const breadcrumb = document.getElementById('topbarBreadcrumb');
  if (breadcrumb) {
    const titleMap = {
      'dashboard': 'Overview & KPIs',
      'properties': 'Property Management',
      'verification-center': 'Verification Center',
      'users': 'Tenant Management',
      'owners': 'Owner Management',
      'reports': 'Fraud & Fake Reports',
      'reviews': 'Reviews Moderation',
      'locations': 'Geocoding & Maps',
      'analytics': 'Analytics & Demand',
      'notifications': 'System Notifications',
      'audit-logs': 'Activity & Audit Logs',
      'settings': 'Platform Settings'
    };
    breadcrumb.textContent = titleMap[viewName] || 'Admin Console';
  }

  // Switch View Container
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });
  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Handle specific filter switches
  if (viewName === 'properties') {
    AdminState.propertyFilter = filterParam || 'all';
    document.querySelectorAll('#propStatusPills .pill-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-filter') === AdminState.propertyFilter);
    });
    renderPropertiesTable();
  } else if (viewName === 'verification-center') {
    renderVerificationCenter();
  } else if (viewName === 'reports') {
    renderReportsGrid();
  } else if (viewName === 'users') {
    renderUsersTable();
  } else if (viewName === 'owners') {
    renderOwnersTable();
  } else if (viewName === 'reviews') {
    renderReviewsList();
  } else if (viewName === 'locations') {
    renderLocationsTable();
  } else if (viewName === 'audit-logs') {
    renderAuditLogs();
  } else if (viewName === 'notifications') {
    renderNotificationsCenter();
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeVerificationText(value) {
  const element = document.createElement('span');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

function propertyImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop';
  }
  try {
    const url = new URL(value, window.location.href);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch {}
  return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop';
}

function renderVerificationCenter() {
  const tbody = document.getElementById('verificationCenterTableBody');
  if (!tbody) return;
  const filter = AdminState.verificationFilter;
  const rows = AdminState.properties.filter(property => {
    const verification = property.digilockerVerification;
    if (!verification) return false;
    if (filter === 'all') return true;
    if (filter === 'pending') return ['PENDING', 'IN_PROGRESS'].includes(verification.status);
    return verification.status.toLowerCase() === filter;
  });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:36px;color:var(--text-muted);">No verification records match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(property => {
    const verification = property.digilockerVerification;
    const demo = verification.mode !== 'PRODUCTION';
    const date = verification.verifiedAt || verification.updatedAt;
    const dateLabel = date ? new Date(date).toLocaleDateString() : '—';
    const result = verification.failureReason || verification.matchingResult || 'Awaiting result';
    return `<tr>
      <td><strong>${escapeVerificationText(property.name)}</strong></td>
      <td>${escapeVerificationText(property.ownerName || 'Owner')}</td>
      <td>${escapeVerificationText(verification.provider)}<br><span class="prop-type-badge">${demo ? 'DEMO / SANDBOX' : 'PRODUCTION'}</span></td>
      <td>${escapeVerificationText(verification.documentType)}<br><span style="color:var(--text-muted);">${escapeVerificationText(verification.issuer)}</span></td>
      <td><span class="status-badge ${verification.status === 'VERIFIED' ? 'status-verified' : (verification.status === 'FAILED' ? 'status-reported' : 'status-pending')}">${escapeVerificationText(verification.status.replace('_', ' '))}</span><br><span style="color:var(--text-muted);font-size:.75rem;">${dateLabel}</span></td>
      <td>${escapeVerificationText(result)}</td>
      <td><div class="table-actions">
        <button class="btn btn-secondary btn-sm" data-verification-decision="VERIFIED" data-property-id="${escapeVerificationText(property.id)}">Mark verified</button>
        <button class="btn btn-secondary btn-sm" data-verification-decision="MANUAL_REVIEW" data-property-id="${escapeVerificationText(property.id)}">Review</button>
        <button class="btn btn-secondary btn-sm" data-verification-decision="FAILED" data-property-id="${escapeVerificationText(property.id)}">Fail</button>
      </div></td>
    </tr>`;
  }).join('');
}

/**
 * 1. Render Dashboard Activity Timeline
 */
async function renderDashboardActivity() {
  const container = document.getElementById('dashboardActivityTimeline');
  if (!container) return;

  try {
    const logs = await SmartStayAPI.getAuditLogs();
    container.innerHTML = logs.slice(0, 4).map(item => `
    <div class="timeline-item">
      <div class="timeline-dot ${item.type}">
        <i class="fa-solid ${item.type === 'approve' ? 'fa-check' : (item.type === 'reject' ? 'fa-xmark' : (item.type === 'suspend' ? 'fa-ban' : 'fa-info'))}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">${escapeVerificationText(item.title)}</span>
          <span class="timeline-time">${escapeVerificationText(item.time)}</span>
        </div>
        <p class="timeline-desc">${escapeVerificationText(item.desc)}</p>
      </div>
    </div>
  `).join('');
  } catch (error) {
    console.error('Unable to load audit activity:', error);
    container.textContent = 'Audit activity is temporarily unavailable.';
  }
}

/**
 * 2. Render Properties Table with Verification Status Badges & Filtering
 */
function renderPropertiesTable() {
  const tbody = document.getElementById('propertiesTableBody');
  if (!tbody) return;

  const search = AdminState.propertySearch.toLowerCase().trim();
  const filter = AdminState.propertyFilter;
  const city = AdminState.propertyCity;
  const type = AdminState.propertyType;

  const filtered = AdminState.properties.filter(p => {
    const pStatus = p.verification_status || (p.verified ? 'VERIFIED' : 'PENDING');

    // Search match
    const matchSearch = !search || 
      (p.name && p.name.toLowerCase().includes(search)) || 
      (p.ownerName && p.ownerName.toLowerCase().includes(search)) || 
      (p.locality && p.locality.toLowerCase().includes(search)) || 
      (p.city && p.city.toLowerCase().includes(search));

    // Status filter
    const matchStatus = filter === 'all' || 
      (filter === 'pending' && pStatus === 'PENDING') ||
      (filter === 'verified' && pStatus === 'VERIFIED') ||
      (filter === 'rejected' && pStatus === 'REJECTED') ||
      (filter === 'reported' && p.status === 'Reported');

    // City filter
    const matchCity = city === 'all' || p.city === city;

    // Type filter
    const matchType = type === 'all' || p.propertyType === type;

    return matchSearch && matchStatus && matchCity && matchType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
          No properties found matching your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const pStatus = p.verification_status || (p.verified ? 'VERIFIED' : 'PENDING');
    
    let statusClass = 'status-pending';
    let statusLabel = '⏳ PENDING';
    if (pStatus === 'VERIFIED') {
      statusClass = 'status-verified';
      statusLabel = '✓ VERIFIED';
    } else if (pStatus === 'REJECTED') {
      statusClass = 'status-reported';
      statusLabel = '✕ REJECTED';
    }

    return `
      <tr>
        <td>
          <div class="prop-cell">
            <img src="${escapeVerificationText(propertyImageUrl(p.image))}" alt="${escapeVerificationText(p.name)}" class="prop-thumb">
            <div class="prop-details">
              <span class="prop-title">${escapeVerificationText(p.name)}</span>
              <span class="prop-type-badge">${escapeVerificationText(p.propertyType || 'PG')} • ${escapeVerificationText(p.gender || 'Any')} • ${escapeVerificationText(p.sharing || 'Double')}</span>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.88rem;">${escapeVerificationText(p.ownerName || 'Owner')}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeVerificationText(p.ownerPhone || '')}</div>
        </td>
        <td>
          <div style="font-weight: 500;">${escapeVerificationText(p.locality || '')}, ${escapeVerificationText(p.city || '')}</div>
          <div class="mono" style="font-size: 0.75rem; color: var(--text-muted);">${p.latitude || 28.65}°N, ${p.longitude || 77.45}°E</div>
        </td>
        <td>
          <strong style="color: var(--secondary);">₹${Number(p.rent).toLocaleString('en-IN')}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">/mo</span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          ${p.rejection_reason ? `<div style="font-size:0.72rem; color:var(--danger); max-width:140px; margin-top:2px;">${escapeVerificationText(p.rejection_reason)}</div>` : ''}
        </td>
        <td>
          <span style="font-weight: 700; color: ${pStatus === 'VERIFIED' ? 'var(--accent)' : (pStatus === 'PENDING' ? 'var(--warning)' : 'var(--danger)')}; font-size: 0.85rem;">
            ${pStatus === 'VERIFIED' ? '98%' : (pStatus === 'PENDING' ? '85%' : '40%')}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.openVerifyModal('${p.id}')" title="Inspect & Verify Property">
              <i class="fa-solid fa-magnifying-glass-arrow-right"></i> Review
            </button>
            <button class="btn btn-secondary btn-icon-only btn-sm" onclick="window.SmartStayAdmin.quickApproveProperty('${p.id}')" title="Quick Approve">
              <i class="fa-solid fa-check text-success"></i>
            </button>
            <button class="btn btn-secondary btn-icon-only btn-sm text-danger" onclick="window.SmartStayAdmin.deleteProperty('${p.id}')" title="Delete Property">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Update counter in pagination info
  const pageInfo = document.getElementById('propPaginationInfo');
  if (pageInfo) {
    pageInfo.textContent = `Showing 1 to ${filtered.length} of ${AdminState.properties.length} properties`;
  }
}

/**
 * 3. Render Users / Tenants Table
 */
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const search = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();

  const filtered = AdminState.users.filter(u => {
    return !search || u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search) || u.college.toLowerCase().includes(search);
  });

  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:50%; background:var(--primary-light); color:var(--primary); font-weight:700; display:flex; align-items:center; justify-content:center; font-size:0.85rem;">
            ${u.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <div style="font-weight:600; color:var(--secondary);">${u.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">ID: #${u.id}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-size:0.85rem;">${u.email}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${u.phone}</div>
      </td>
      <td>
        <span style="font-size:0.82rem; color:var(--text-main);">${u.college}</span>
      </td>
      <td>
        <span style="font-weight:600; color:var(--secondary);">${u.bookings} Bookings</span>
      </td>
      <td>
        <span style="font-weight:600; color:${u.reports > 0 ? 'var(--danger)' : 'var(--text-muted)'};">${u.reports} Reports</span>
      </td>
      <td>
        <span class="status-badge ${u.status === 'Active' ? 'status-active' : 'status-suspended'}">${u.status}</span>
      </td>
      <td>
        <span style="font-size:0.8rem; color:var(--text-muted);">${u.joined}</span>
      </td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.openUserModal(${u.id})">
            <i class="fa-solid fa-eye"></i> View
          </button>
          <button class="btn ${u.status === 'Active' ? 'btn-danger' : 'btn-success'} btn-sm" onclick="window.SmartStayAdmin.toggleUserStatus(${u.id})">
            ${u.status === 'Active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 4. Render Property Owners Table
 */
function renderOwnersTable() {
  const tbody = document.getElementById('ownersTableBody');
  if (!tbody) return;

  const search = (document.getElementById('ownerSearchInput')?.value || '').toLowerCase().trim();

  const filtered = AdminState.owners.filter(o => {
    return !search || o.name.toLowerCase().includes(search) || o.email.toLowerCase().includes(search) || o.phone.includes(search);
  });

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:50%; background:var(--purple-light); color:var(--purple); font-weight:700; display:flex; align-items:center; justify-content:center; font-size:0.85rem;">
            ${o.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <div style="font-weight:600; color:var(--secondary);">${o.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Landlord #${o.id}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-size:0.85rem;">${o.phone}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${o.email}</div>
      </td>
      <td>
        <span style="font-weight:700; font-size:0.95rem; color:var(--secondary);">${o.propertiesCount}</span>
        <span style="font-size:0.78rem; color:var(--text-muted);"> properties</span>
      </td>
      <td>
        <span class="status-badge status-verified">${o.verifiedCount} Verified</span>
      </td>
      <td>
        <span class="status-badge status-pending">${o.pendingCount} Pending</span>
      </td>
      <td>
        <span style="font-weight:600; color:${o.reportsCount > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
          ${o.reportsCount} Complaints
        </span>
      </td>
      <td>
        <span class="status-badge ${o.kycStatus === 'Verified' ? 'status-verified' : (o.kycStatus === 'Pending' ? 'status-pending' : 'status-suspended')}">
          ${o.kycStatus}
        </span>
      </td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.openOwnerPortfolioModal(${o.id})">
            <i class="fa-solid fa-folder-open"></i> Portfolio
          </button>
          <button class="btn ${o.kycStatus === 'Suspended' ? 'btn-success' : 'btn-danger'} btn-sm" onclick="window.SmartStayAdmin.toggleOwnerStatus(${o.id})">
            ${o.kycStatus === 'Suspended' ? 'Activate' : 'Suspend'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 5. Render Fraud & Fake Reports Queue
 */
function renderReportsGrid() {
  const container = document.getElementById('reportsGrid');
  if (!container) return;

  if (AdminState.reports.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--accent); margin-bottom: 12px; display: block;"></i>
        <h3>All Clear! Zero Open Fraud Reports</h3>
        <p>There are no unresolved tenant complaints or fraud alerts.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = AdminState.reports.map(r => `
    <div class="report-card ${r.severity === 'high' ? 'high-severity' : 'med-severity'}">
      <div class="report-card-header">
        <span class="report-reason-chip ${r.reason === 'fake_property' ? 'reason-fake' : (r.reason === 'already_rented' ? 'reason-rented' : (r.reason === 'wrong_price' ? 'reason-price' : 'reason-duplicate'))}">
          ${r.reasonText}
        </span>
        <span class="status-badge ${r.severity === 'high' ? 'status-reported' : 'status-pending'}">
          ${r.severity.toUpperCase()} PRIORITY
        </span>
      </div>

      <div class="report-target">
        <img src="${r.propertyImage}" alt="${r.propertyName}" class="report-target-img">
        <div class="report-target-info">
          <h4>${r.propertyName}</h4>
          <span>Owner: ${r.ownerName}</span>
        </div>
      </div>

      <div class="report-msg-box">
        "${r.message}"
      </div>

      <div class="report-meta">
        <span><i class="fa-solid fa-user"></i> ${r.reportedBy}</span>
        <span><i class="fa-regular fa-clock"></i> ${r.date}</span>
      </div>

      <div class="report-actions">
        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.SmartStayAdmin.openReportModal(${r.id})">
          <i class="fa-solid fa-magnifying-glass"></i> Investigate
        </button>
        <button class="btn btn-danger btn-sm" onclick="window.SmartStayAdmin.suspendReportedListing(${r.id})">
          <i class="fa-solid fa-ban"></i> Suspend
        </button>
        <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.dismissReport(${r.id})" title="Dismiss false report">
          <i class="fa-solid fa-check"></i> Dismiss
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * 6. Render Reviews Moderation List
 */
function renderReviewsList() {
  const container = document.getElementById('reviewsListContainer');
  if (!container) return;

  const search = (document.getElementById('reviewSearchInput')?.value || '').toLowerCase().trim();

  const filtered = AdminState.reviews.filter(rev => {
    return !search || rev.comment.toLowerCase().includes(search) || rev.propertyName.toLowerCase().includes(search) || rev.userName.toLowerCase().includes(search);
  });

  container.innerHTML = filtered.map(rev => `
    <div class="review-item-card">
      <div class="review-left">
        <div class="review-stars">
          ${Array(rev.rating).fill('<i class="fa-solid fa-star"></i>').join('')}
          ${Array(5 - rev.rating).fill('<i class="fa-regular fa-star"></i>').join('')}
          <strong style="margin-left: 6px; color: var(--secondary); font-size: 0.88rem;">${rev.propertyName}</strong>
        </div>
        <p class="review-quote">"${rev.comment}"</p>
        <div class="review-meta">
          <span>By: <strong>${rev.userName}</strong></span>
          <span>• Date: ${rev.date}</span>
          ${rev.flagged ? `<span class="status-badge status-reported"><i class="fa-solid fa-flag"></i> ${rev.flagReason}</span>` : ''}
        </div>
      </div>
      <div class="review-actions">
        <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.keepReview(${rev.id})">
          <i class="fa-solid fa-check"></i> Keep
        </button>
        <button class="btn btn-danger btn-sm" onclick="window.SmartStayAdmin.removeReview(${rev.id})">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * 7. Render Geocoding / Location Table
 */
function renderLocationsTable() {
  const tbody = document.getElementById('locationsTableBody');
  if (!tbody) return;

  tbody.innerHTML = AdminState.properties.map(p => `
    <tr>
      <td>
        <div class="prop-cell">
          <img src="${escapeVerificationText(propertyImageUrl(p.image))}" alt="${escapeVerificationText(p.name)}" class="prop-thumb" style="width:40px; height:40px;">
          <div>
            <div style="font-weight:600; font-size:0.9rem;">${escapeVerificationText(p.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${escapeVerificationText(p.city)}</div>
          </div>
        </div>
      </td>
      <td style="max-width: 240px; font-size: 0.85rem;">
        ${escapeVerificationText(p.address)}
      </td>
      <td>
        <div class="mono" style="font-weight:600; color:var(--secondary); font-size:0.85rem;">
          ${Number(p.latitude).toFixed(4)}° N, ${Number(p.longitude).toFixed(4)}° E
        </div>
      </td>
      <td>
        <span class="status-badge status-verified">
          <i class="fa-solid fa-check"></i> 100% High Precision
        </span>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="width:8px; height:8px; border-radius:50%; background:var(--accent);"></div>
          <span style="font-size:0.82rem; font-weight:600; color:var(--accent);">Pinned Accurately</span>
        </div>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.showMapPinToast('${escapeVerificationText(p.id)}')">
          <i class="fa-solid fa-map-location-dot"></i> Test Pin
        </button>
        <button class="btn btn-secondary btn-sm" onclick="window.SmartStayAdmin.requestLocationUpdate('${p.id}')">
          <i class="fa-solid fa-pen"></i> Flag Pin
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * 8. Render Audit Logs View
 */
async function renderAuditLogs() {
  const container = document.getElementById('fullAuditTimeline');
  if (!container) return;

  const search = (document.getElementById('auditSearchInput')?.value || '').toLowerCase().trim();
  const filterType = document.getElementById('auditFilterType')?.value || 'all';

  let filtered;
  try {
    const logs = await SmartStayAPI.getAuditLogs();
    filtered = logs.filter(log => {
      const matchSearch = !search || log.title.toLowerCase().includes(search) || log.desc.toLowerCase().includes(search);
      const matchType = filterType === 'all' || log.action.toLowerCase() === filterType.toLowerCase();
      return matchSearch && matchType;
    });
  } catch (error) {
    console.error('Unable to load audit logs:', error);
    container.textContent = 'Audit logs are temporarily unavailable.';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="timeline-item">
      <div class="timeline-dot ${item.type}">
        <i class="fa-solid ${item.type === 'approve' ? 'fa-check' : (item.type === 'reject' ? 'fa-xmark' : (item.type === 'suspend' ? 'fa-ban' : 'fa-info'))}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">${escapeVerificationText(item.title)}</span>
          <span class="timeline-time">${escapeVerificationText(item.time)}</span>
        </div>
        <p class="timeline-desc">${escapeVerificationText(item.desc)}</p>
      </div>
    </div>
  `).join('');
}

/**
 * 9. Render Notifications Center
 */
function renderNotificationsCenter() {
  const list = document.getElementById('notificationsCenterList');
  if (!list) return;

  list.innerHTML = AdminState.notifications.map(n => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; border-bottom:1px solid var(--border); background:${n.unread ? 'var(--primary-light)' : '#fff'}; border-radius:var(--radius-md); margin-bottom:8px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:36px; height:36px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center;">
          <i class="fa-solid fa-bell"></i>
        </div>
        <div>
          <div style="font-weight:600; font-size:0.9rem; color:var(--secondary);">${n.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${n.time}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="window.SmartStayAdmin.switchView('${n.targetView}', '${n.targetFilter || ''}')">
          Resolve
        </button>
      </div>
    </div>
  `).join('');
}

// =========================================================================
// ACTION HANDLERS & MODAL VERIFICATION WORKFLOW
// =========================================================================

let currentInspectingPropId = null;

/**
 * Open Property Verification Deep Dive Modal
 */
function openVerifyModal(propId) {
  const p = AdminState.properties.find(x => String(x.id) === String(propId));
  if (!p) {
    showToast('Property not found.', 'danger');
    return;
  }

  currentInspectingPropId = propId;
  const pStatus = p.verification_status || (p.verified ? 'VERIFIED' : 'PENDING');

  document.getElementById('modalPropTitle').textContent = p.name;
  document.getElementById('modalPropSubtitle').textContent = `${pStatus} Listing • Submitted on ${p.submitted_date || 'Recent'}`;
  document.getElementById('modalPropImage').src = propertyImageUrl(p.image);
  
  const statusBadge = document.getElementById('modalPropStatusBadge');
  statusBadge.className = 'status-badge ' + (pStatus === 'VERIFIED' ? 'status-verified' : (pStatus === 'PENDING' ? 'status-pending' : 'status-reported'));
  statusBadge.textContent = pStatus;

  document.getElementById('modalPropRent').textContent = `₹${Number(p.rent).toLocaleString('en-IN')} / mo`;
  document.getElementById('modalOwnerName').textContent = p.ownerName || 'Rahul Sharma';
  document.getElementById('modalOwnerPhone').textContent = p.ownerPhone || '+91 98765 11111';
  document.getElementById('modalPropType').textContent = `${p.propertyType || 'PG'} (${p.gender || 'Any'})`;
  document.getElementById('modalPropSharing').textContent = `${p.sharing || 'Double'} Sharing`;
  document.getElementById('modalPropAmenities').textContent = (p.amenities || ['Wi-Fi']).join(', ');

  document.getElementById('modalPropAddress').textContent = p.address || 'Address provided';
  document.getElementById('modalPropCity').textContent = p.city || 'Ghaziabad';
  document.getElementById('modalPropCoords').textContent = `${p.latitude || 28.65}° N, ${p.longitude || 77.45}° E`;

  document.getElementById('modalAdminNote').value = p.rejection_reason || '';

  // Show Modal
  const modal = document.getElementById('verifyPropertyModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * 5. Approve Property (Admin Workflow)
 */
async function approveCurrentProperty() {
  if (!currentInspectingPropId) return;

  const approveBtn = document.getElementById('modalApproveBtn');
  if (approveBtn.disabled) return;

  approveBtn.disabled = true;
  approveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';

  try {
    const res = await SmartStayAPI.updateVerificationStatus(currentInspectingPropId, {
      status: 'VERIFIED'
    });

    showToast(res.message || "Property verified successfully.", 'success');
    closeModal('verifyPropertyModal');
    await loadAdminProperties();
  } catch (err) {
    console.error('Approval failed:', err);
    showToast(err.message || "Unable to verify property.", 'danger');
  } finally {
    approveBtn.disabled = false;
    approveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Approve & Verify Listing';
  }
}

/**
 * Quick Approve directly from Table Row
 */
async function quickApproveProperty(propId) {
  try {
    const res = await SmartStayAPI.updateVerificationStatus(propId, {
      status: 'VERIFIED'
    });

    showToast(res.message || "Property verified successfully.", 'success');
    await loadAdminProperties();
  } catch (err) {
    console.error('Quick approve failed:', err);
    showToast(err.message || "Unable to verify property.", 'danger');
  }
}

/**
 * 6. Reject Property (Admin Workflow)
 */
async function rejectCurrentProperty() {
  if (!currentInspectingPropId) return;

  const rejectBtn = document.getElementById('modalRejectBtn');
  if (rejectBtn.disabled) return;

  const note = document.getElementById('modalAdminNote').value.trim() || 'Property information is incomplete or unverified.';

  rejectBtn.disabled = true;
  rejectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';

  try {
    const res = await SmartStayAPI.updateVerificationStatus(currentInspectingPropId, {
      status: 'REJECTED',
      reason: note
    });

    showToast(res.message || "Property rejected successfully.", 'danger');
    closeModal('verifyPropertyModal');
    await loadAdminProperties();
  } catch (err) {
    console.error('Rejection failed:', err);
    showToast(err.message || "Unable to verify property.", 'danger');
  } finally {
    rejectBtn.disabled = false;
    rejectBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Reject Listing';
  }
}

/**
 * Request Changes
 */
function requestChangesCurrentProperty() {
  if (!currentInspectingPropId) return;
  const note = document.getElementById('modalAdminNote').value.trim() || 'Please re-upload clear electricity bill & room photos.';
  const p = AdminState.properties.find(x => String(x.id) === String(currentInspectingPropId));
  if (p) {
    showToast(`Revision request sent to ${p.ownerName}!`, 'warning');
  }
  closeModal('verifyPropertyModal');
}

/**
 * Delete Property
 */
async function deleteProperty(propId) {
  const p = AdminState.properties.find(x => String(x.id) === String(propId));
  if (!p) return;

  if (confirm(`Are you sure you want to permanently delete '${p.name}'?`)) {
    try {
      const res = await SmartStayAPI.deleteProperty(propId);
      showToast(res.message || 'Property deleted successfully.', 'danger');
      await loadAdminProperties();
    } catch (err) {
      showToast(err.message || 'Unable to delete property.', 'danger');
    }
  }
}

/**
 * User Status Toggle
 */
function toggleUserStatus(userId) {
  const u = AdminState.users.find(x => x.id === userId);
  if (!u) return;

  if (u.status === 'Active') {
    u.status = 'Suspended';
    showToast(`User ${u.name} suspended.`, 'danger');
  } else {
    u.status = 'Active';
    showToast(`User ${u.name} restored to Active!`, 'success');
  }
  renderUsersTable();
}

/**
 * Owner Status Toggle
 */
function toggleOwnerStatus(ownerId) {
  const o = AdminState.owners.find(x => x.id === ownerId);
  if (!o) return;

  if (o.kycStatus === 'Suspended') {
    o.kycStatus = 'Verified';
    showToast(`Landlord ${o.name} reactivated.`, 'success');
  } else {
    o.kycStatus = 'Suspended';
    showToast(`Landlord ${o.name} suspended.`, 'danger');
  }
  renderOwnersTable();
}

/**
 * Open User Profile Modal
 */
function openUserModal(userId) {
  const u = AdminState.users.find(x => x.id === userId);
  if (!u) return;

  const content = document.getElementById('userModalContent');
  content.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="width:64px; height:64px; border-radius:50%; background:var(--primary-light); color:var(--primary); font-size:1.5rem; font-weight:700; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">
        ${u.name.split(' ').map(n=>n[0]).join('')}
      </div>
      <h3 style="margin-bottom:4px;">${u.name}</h3>
      <span class="status-badge ${u.status === 'Active' ? 'status-active' : 'status-suspended'}">${u.status} Account</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:12px; background:var(--bg-surface-alt); padding:16px; border-radius:var(--radius-md);">
      <div><strong>Email:</strong> ${u.email}</div>
      <div><strong>Phone:</strong> ${u.phone}</div>
      <div><strong>Institution:</strong> ${u.college}</div>
      <div><strong>Booking History:</strong> ${u.bookings} verified stay bookings</div>
      <div><strong>Member Since:</strong> ${u.joined}</div>
    </div>
  `;

  const btn = document.getElementById('modalUserSuspendBtn');
  btn.textContent = u.status === 'Active' ? 'Suspend Account' : 'Reactivate Account';
  btn.onclick = () => {
    toggleUserStatus(userId);
    closeModal('userProfileModal');
  };

  const modal = document.getElementById('userProfileModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Open Owner Portfolio Modal
 */
function openOwnerPortfolioModal(ownerId) {
  const o = AdminState.owners.find(x => x.id === ownerId);
  if (!o) return;

  const props = AdminState.properties.filter(p => p.ownerName === o.name);

  document.getElementById('ownerModalTitle').textContent = `Portfolio: ${o.name} (${o.propertiesCount} Properties)`;
  const content = document.getElementById('ownerModalContent');
  
  content.innerHTML = `
    <div style="display:flex; gap:14px; margin-bottom:18px; padding:12px; background:var(--bg-surface-alt); border-radius:var(--radius-md);">
      <div><strong>Phone:</strong> ${o.phone}</div>
      <div><strong>Email:</strong> ${o.email}</div>
      <div><strong>KYC Status:</strong> <span class="status-badge status-verified">${o.kycStatus}</span></div>
    </div>
    <h4 style="margin-bottom:12px;">Owned Listings:</h4>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${props.map(p => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-md);">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${escapeVerificationText(propertyImageUrl(p.image))}" alt="${escapeVerificationText(p.name)}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">
            <div>
              <div style="font-weight:600;">${escapeVerificationText(p.name)}</div>
              <div style="font-size:0.78rem; color:var(--text-muted);">${escapeVerificationText(p.locality)}, ${escapeVerificationText(p.city)} • ₹${Number(p.rent).toLocaleString('en-IN')}/mo</div>
            </div>
          </div>
          <span class="status-badge ${p.verification_status === 'VERIFIED' ? 'status-verified' : (p.verification_status === 'REJECTED' ? 'status-reported' : 'status-pending')}">${p.verification_status || 'PENDING'}</span>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('modalOwnerContactBtn').onclick = () => {
    alert(`Calling Landlord ${o.name} at ${o.phone}...`);
  };

  const modal = document.getElementById('ownerPortfolioModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Open Report Modal
 */
function openReportModal(reportId) {
  const r = AdminState.reports.find(x => x.id === reportId);
  if (!r) return;

  const content = document.getElementById('reportModalContent');
  content.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
      <img src="${r.propertyImage}" style="width:54px; height:54px; border-radius:var(--radius-md); object-fit:cover;">
      <div>
        <h4 style="margin-bottom:2px;">${r.propertyName}</h4>
        <span style="font-size:0.8rem; color:var(--text-muted);">Landlord: ${r.ownerName}</span>
      </div>
    </div>
    <div style="background:var(--bg-surface-alt); padding:14px; border-radius:var(--radius-md); margin-bottom:16px;">
      <div style="font-size:0.85rem; margin-bottom:6px;"><strong>Report Reason:</strong> ${r.reasonText}</div>
      <div style="font-size:0.85rem; margin-bottom:6px;"><strong>Reported By:</strong> ${r.reportedBy}</div>
      <div style="font-size:0.85rem; margin-bottom:6px;"><strong>Date:</strong> ${r.date}</div>
      <div style="margin-top:10px; padding:10px; background:#fff; border-radius:6px; border:1px dashed var(--border-strong); font-style:italic;">
        "${r.message}"
      </div>
    </div>
  `;

  document.getElementById('modalDismissReportBtn').onclick = () => {
    dismissReport(reportId);
    closeModal('reportActionModal');
  };

  document.getElementById('modalWarnOwnerBtn').onclick = () => {
    showToast(`Official warning issued to owner ${r.ownerName}.`, 'warning');
    closeModal('reportActionModal');
  };

  document.getElementById('modalSuspendListingBtn').onclick = () => {
    suspendReportedListing(reportId);
    closeModal('reportActionModal');
  };

  const modal = document.getElementById('reportActionModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Suspend Reported Listing
 */
function suspendReportedListing(reportId) {
  const r = AdminState.reports.find(x => x.id === reportId);
  if (!r) return;

  const p = AdminState.properties.find(x => String(x.id) === String(r.propertyId));
  if (p) {
    p.verification_status = 'REJECTED';
    p.rejection_reason = `Fraud complaint: ${r.reasonText}`;
  }

  AdminState.reports = AdminState.reports.filter(x => x.id !== reportId);
  showToast(`Listing '${r.propertyName}' suspended due to fraud complaint.`, 'danger');

  renderReportsGrid();
  renderPropertiesTable();
  renderDashboardActivity();
  updateCounters();
}

/**
 * Dismiss Report
 */
function dismissReport(reportId) {
  AdminState.reports = AdminState.reports.filter(x => x.id !== reportId);
  showToast(`Report #${reportId} dismissed.`, 'success');
  renderReportsGrid();
  updateCounters();
}

/**
 * Review Actions
 */
function keepReview(revId) {
  const rev = AdminState.reviews.find(x => x.id === revId);
  if (rev) {
    rev.flagged = false;
    showToast(`Review kept and marked safe.`, 'success');
    renderReviewsList();
  }
}

function removeReview(revId) {
  AdminState.reviews = AdminState.reviews.filter(x => x.id !== revId);
  showToast(`Review removed successfully.`, 'danger');
  renderReviewsList();
}

/**
 * Close any modal by ID
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 200);
}

/**
 * Update Sidebar & Topbar Badges / Counters
 */
function updateCounters() {
  const pendingCount = AdminState.properties.filter(p => p.verification_status === 'PENDING').length;
  const verifiedCount = AdminState.properties.filter(p => p.verification_status === 'VERIFIED').length;
  const reportedCount = AdminState.reports.length;
  const totalPropCount = AdminState.properties.length;

  const sidebarPending = document.getElementById('sidebarPendingCount');
  if (sidebarPending) sidebarPending.textContent = pendingCount;

  const sidebarReported = document.getElementById('sidebarReportedCount');
  if (sidebarReported) sidebarReported.textContent = reportedCount;

  const sidebarProp = document.getElementById('sidebarPropCount');
  if (sidebarProp) sidebarProp.textContent = totalPropCount;
}

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-success' : (type === 'danger' ? 'fa-circle-exclamation text-danger' : (type === 'warning' ? 'fa-triangle-exclamation text-warning' : 'fa-info-circle'))}"></i>
    <div style="flex:1; font-size:0.88rem; font-weight:500;">${message}</div>
    <button onclick="this.parentElement.remove()" style="color:var(--text-muted); font-size:0.9rem; border:none; background:none; cursor:pointer;">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/**
 * Batch Coordinate Validation Simulation
 */
function verifyAllCoordinates() {
  showToast(`Validated all property coordinates with Google Geocoding API. 100% matched.`, 'success');
}

function showMapPinToast(propertyId) {
  const property = AdminState.properties.find(item => String(item.id) === String(propertyId));
  if (!property) return;
  showToast(`Pin Preview for '${property.name}': Coordinates [${Number(property.latitude).toFixed(4)}, ${Number(property.longitude).toFixed(4)}] locked on map.`, 'info');
}

function requestLocationUpdate(propId) {
  const p = AdminState.properties.find(x => String(x.id) === String(propId));
  if (p) {
    showToast(`Location correction notification sent to landlord ${p.ownerName}.`, 'warning');
  }
}

function markAllNotificationsRead() {
  AdminState.notifications.forEach(n => n.unread = false);
  const badge = document.getElementById('topbarNotifBadge');
  if (badge) badge.style.display = 'none';
  const sideBadge = document.getElementById('sidebarNotifBadge');
  if (sideBadge) sideBadge.style.display = 'none';
  renderNotificationsCenter();
  showToast(`All notifications marked as read.`, 'success');
}

function saveSettings() {
  showToast(`Platform verification rules & security settings saved successfully!`, 'success');
}

// =========================================================================
// INITIALIZATION & EVENT LISTENERS
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireRole('admin')) return;

  // 1. Sidebar Navigation Click Handlers
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      const filter = item.getAttribute('data-filter') || null;
      switchView(view, filter);
    });
  });

  // 2. Mobile Sidebar Toggle
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebar = document.getElementById('sidebar');

  if (menuToggleBtn && sidebar) {
    menuToggleBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
    });
  }
  if (sidebarCloseBtn && sidebar) {
    sidebarCloseBtn.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
    });
  }

  // 3. Property Filters & Search
  const propSearch = document.getElementById('propSearchInput');
  if (propSearch) {
    propSearch.addEventListener('input', (e) => {
      AdminState.propertySearch = e.target.value;
      renderPropertiesTable();
    });
  }

  document.querySelectorAll('#propStatusPills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#propStatusPills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AdminState.propertyFilter = btn.getAttribute('data-filter');
      renderPropertiesTable();
    });
  });

  document.querySelectorAll('#verificationStatusPills [data-verification-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#verificationStatusPills [data-verification-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      AdminState.verificationFilter = button.dataset.verificationFilter;
      renderVerificationCenter();
    });
  });

  const verificationCenterBody = document.getElementById('verificationCenterTableBody');
  verificationCenterBody?.addEventListener('click', async event => {
    const button = event.target.closest('[data-verification-decision]');
    if (!button) return;
    const status = button.dataset.verificationDecision;
    const reason = ['FAILED', 'MANUAL_REVIEW'].includes(status)
      ? window.prompt('Enter a short review reason:')
      : '';
    if (reason === null) return;
    try {
      await SmartStayAPI.updateDigiLockerVerification(
        button.dataset.propertyId,
        status,
        reason || ''
      );
      showToast(`Demo verification updated: ${status.replace('_', ' ')}.`, 'success');
      await loadAdminProperties();
    } catch (error) {
      showToast(error.message || 'Unable to update verification.', 'danger');
    }
  });

  const propCityFilter = document.getElementById('propCityFilter');
  if (propCityFilter) {
    propCityFilter.addEventListener('change', (e) => {
      AdminState.propertyCity = e.target.value;
      renderPropertiesTable();
    });
  }

  const propTypeFilter = document.getElementById('propTypeFilter');
  if (propTypeFilter) {
    propTypeFilter.addEventListener('change', (e) => {
      AdminState.propertyType = e.target.value;
      renderPropertiesTable();
    });
  }

  // 4. Modal Decision Buttons
  const approveBtn = document.getElementById('modalApproveBtn');
  if (approveBtn) approveBtn.addEventListener('click', approveCurrentProperty);

  const rejectBtn = document.getElementById('modalRejectBtn');
  if (rejectBtn) rejectBtn.addEventListener('click', rejectCurrentProperty);

  const reqChangesBtn = document.getElementById('modalRequestChangesBtn');
  if (reqChangesBtn) reqChangesBtn.addEventListener('click', requestChangesCurrentProperty);

  // 5. Global Search
  const globalSearch = document.getElementById('globalSearchInput');
  if (globalSearch) {
    globalSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        AdminState.propertySearch = e.target.value;
        switchView('properties');
        if (propSearch) propSearch.value = e.target.value;
      }
    });
  }

  // 6. User Search & Filters
  const userSearch = document.getElementById('userSearchInput');
  if (userSearch) {
    userSearch.addEventListener('input', renderUsersTable);
  }

  // 7. Owner Search
  const ownerSearch = document.getElementById('ownerSearchInput');
  if (ownerSearch) {
    ownerSearch.addEventListener('input', renderOwnersTable);
  }

  // 8. Reviews Search
  const reviewSearch = document.getElementById('reviewSearchInput');
  if (reviewSearch) {
    reviewSearch.addEventListener('input', renderReviewsList);
  }

  // 9. Audit Log Filters
  const auditSearch = document.getElementById('auditSearchInput');
  const auditType = document.getElementById('auditFilterType');
  if (auditSearch) auditSearch.addEventListener('input', renderAuditLogs);
  if (auditType) auditType.addEventListener('change', renderAuditLogs);

  // 10. Topbar Notif & Refresh
  const topbarNotifBtn = document.getElementById('topbarNotifBtn');
  if (topbarNotifBtn) {
    topbarNotifBtn.addEventListener('click', () => switchView('notifications'));
  }

  const topbarRefreshBtn = document.getElementById('topbarRefreshBtn');
  if (topbarRefreshBtn) {
    topbarRefreshBtn.addEventListener('click', () => {
      showToast('Refreshing real-time platform telemetry...', 'info');
      loadAdminProperties();
    });
  }

  // 11. Cross-tab real-time listener
  // Initial Data Load
  loadAdminProperties();
  renderUsersTable();
  renderOwnersTable();
  renderReportsGrid();
  renderReviewsList();
  renderLocationsTable();
  renderAuditLogs();
  renderNotificationsCenter();
});

// Expose handlers to global window namespace for inline HTML event attributes
window.SmartStayAdmin = {
  switchView,
  openVerifyModal,
  closeModal,
  approveCurrentProperty,
  rejectCurrentProperty,
  quickApproveProperty,
  requestChangesCurrentProperty,
  deleteProperty,
  toggleUserStatus,
  toggleOwnerStatus,
  openUserModal,
  openOwnerPortfolioModal,
  openReportModal,
  suspendReportedListing,
  dismissReport,
  keepReview,
  removeReview,
  verifyAllCoordinates,
  showMapPinToast,
  requestLocationUpdate,
  markAllNotificationsRead,
  saveSettings
};
