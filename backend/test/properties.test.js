const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPropertyFilters,
  mapProperty,
  mapUnit,
  validateUnitInput
} = require('../src/routes/properties');

test('property creation input rejects missing, invalid, and privileged fields', () => {
  const { validatePropertyInput } = require('../src/routes/properties');
  const empty = validatePropertyInput(null);
  assert.ok(empty.errors.some(error => error.includes('name is required')));

  const invalid = validatePropertyInput({
    name: '  Flat  ',
    propertyType: 'Apartment',
    rent: -1,
    city: 'Noida',
    locality: 'Sector 62',
    address: 'Sector 62',
    verification_status: 'VERIFIED',
    amenities: 'Wi-Fi'
  });
  assert.ok(invalid.errors.some(error => error.includes('rent must be a positive amount')));
  assert.ok(invalid.errors.some(error => error.includes('amenities must be an array')));
  assert.equal(invalid.values.verification_status, undefined);
  assert.equal(invalid.values.name, 'Flat');
});

test('property filters use placeholders for user-provided values and enforce public status', () => {
  const filters = buildPropertyFilters({
    searchText: "Noida' OR 1=1 --",
    city: 'Noida',
    minRent: '5000',
    gender: 'Women',
    amenities: ['Wi-Fi', 'Food']
  }, { publicOnly: true });

  assert.match(filters.where, /p\.verification_status = 'VERIFIED'/);
  assert.match(filters.where, /p\.city = \?/);
  assert.match(filters.where, /p\.rent >= \?/);
  assert.match(filters.where, /JSON_CONTAINS/);
  assert.ok(filters.parameters.includes("%Noida' OR 1=1 --%"));
  assert.ok(!filters.where.includes("Noida' OR 1=1 --"));
});

test('property API mapper returns UI-compatible status, ownership, and listing attributes', () => {
  const property = mapProperty({
    id: 7,
    owner_id: 3,
    owner_name: 'Owner',
    name: 'Room',
    property_type: 'PG',
    rent: '8000.00',
    city: 'Noida',
    locality: 'Sector 62',
    address: 'Block A',
    latitude: '28.60',
    longitude: '77.30',
    available: 1,
    sharing: 'Double',
    gender: 'Any',
    amenities: '["Wi-Fi"]',
    verification_status: 'PENDING',
    verification_id: 12,
    verification_provider: 'Demo',
    verification_mode: 'DEMO',
    verification_result: 'MANUAL_REVIEW'
  });

  assert.equal(property.ownerId, 3);
  assert.equal(property.rent, 8000);
  assert.equal(property.rating, 0);
  assert.equal(property.verification_status, 'PENDING');
  assert.deepEqual(property.amenities, ['Wi-Fi']);
  assert.equal(property.digilockerVerification.mode, 'DEMO');
});

test('unit input accepts supported availability statuses and rejects invalid values', () => {
  assert.deepEqual(validateUnitInput({ name: ' Room 101 ' }), {
    errors: [],
    values: { unit_name: 'Room 101', availability_status: 'AVAILABLE' }
  });
  assert.deepEqual(validateUnitInput({
    name: 'Room 102',
    availabilityStatus: 'occupied'
  }), {
    errors: [],
    values: { unit_name: 'Room 102', availability_status: 'OCCUPIED' }
  });
  assert.ok(validateUnitInput({ name: ' ' }).errors.length > 0);
  assert.ok(validateUnitInput({
    name: 'Room 103',
    availabilityStatus: 'FREE'
  }).errors.some(error => error.includes('availabilityStatus')));
});

test('unit mapper exposes owner and tenant availability fields', () => {
  assert.deepEqual(mapUnit({
    id: 12,
    property_id: 7,
    unit_name: 'Room 101',
    availability_status: 'RESERVED',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z'
  }), {
    id: 12,
    propertyId: 7,
    name: 'Room 101',
    availabilityStatus: 'RESERVED',
    lastConfirmedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z'
  });
});

test('available-now property filter uses unit status while preserving legacy properties', () => {
  const filters = buildPropertyFilters({ availableNow: 'true' }, { publicOnly: true });
  assert.match(filters.where, /available_unit\.availability_status = 'AVAILABLE'/);
  assert.match(filters.where, /NOT EXISTS \(SELECT 1 FROM property_units any_unit/);
  assert.match(filters.where, /p\.available = TRUE/);
});
