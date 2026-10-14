const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../src/db/pool');
const { publicRouter, ownerRouter } = require('../src/routes/properties');
const { hashToken } = require('../src/middleware/require-auth');

test('unit availability persists, is public, and remains scoped to its property owner', async t => {
  const originalExecute = pool.execute;
  const originalGetConnection = pool.getConnection;
  const units = [];
  const availabilityEvents = [];
  const reports = [{ property_id: 55, reason: 'already_rented' }];
  let nextUnitId = 1;
  const property = {
    id: 55,
    owner_id: 22,
    owner_name: 'Property Owner',
    name: 'Skyline Boys PG',
    description: null,
    property_type: 'PG',
    rent: '9000.00',
    city: 'Noida',
    locality: 'Sector 62',
    address: 'Block A',
    latitude: null,
    longitude: null,
    verification_status: 'VERIFIED',
    verification_reason: null,
    verified_by: null,
    verified_at: null,
    available: 1,
    sharing: 'Double',
    gender: 'Any',
    amenities: '[]',
    image_url: null,
    owner_phone: null,
    created_at: '2026-01-01T00:00:00.000Z',
    rating: 0,
    review_count: 0
  };

  const executeMock = async (sql, parameters = []) => {
    if (sql.includes('FROM auth_sessions s')) {
      const ownerId = parameters[0] === hashToken('owner-token') ? 22 : 33;
      return [[{
        id: ownerId,
        name: ownerId === 22 ? 'Property Owner' : 'Other Owner',
        email: 'owner@example.com',
        role: 'owner',
        owner_verification_status: 'VERIFIED'
      }]];
    }
    if (sql.startsWith('INSERT INTO availability_events')) {
      availabilityEvents.push({ parameters, created_at: new Date() });
      return [{ affectedRows: 1, insertId: 1 }];
    }
    if (sql.startsWith('INSERT INTO property_units')) {
      const [unitName, availabilityStatus, propertyId, ownerId] = parameters;
      if (Number(propertyId) !== property.id || Number(ownerId) !== property.owner_id) {
        return [{ affectedRows: 0, insertId: 0 }];
      }
      const unit = {
        id: nextUnitId++,
        property_id: property.id,
        unit_name: unitName,
        availability_status: availabilityStatus,
        last_confirmed_at: new Date(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      units.push(unit);
      return [{ affectedRows: 1, insertId: unit.id }];
    }
    if (sql.startsWith('UPDATE property_units')) {
      const [availabilityStatus, unitId, propertyId] = parameters;
      const unit = units.find(item =>
        item.id === Number(unitId) &&
        property.id === Number(propertyId)
      );
      if (!unit) return [{ affectedRows: 0 }];
      unit.availability_status = availabilityStatus;
      unit.last_confirmed_at = new Date();
      unit.updated_at = new Date().toISOString();
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM reports')) return [reports];
    if (sql.includes('FROM property_units pu') && sql.includes('FOR UPDATE')) {
      const [unitId, propertyId, ownerId] = parameters;
      const rows = property.id === Number(propertyId) && property.owner_id === Number(ownerId)
        ? units.filter(unit => unit.id === Number(unitId))
        : [];
      return [rows.map(unit => ({ ...unit }))];
    }
    if (sql.includes('FROM property_units pu') && sql.includes('JOIN properties p')) {
      const [unitId, propertyId, ownerId] = parameters;
      const rows = property.id === Number(propertyId) && property.owner_id === Number(ownerId)
        ? units.filter(unit => unit.id === Number(unitId))
        : [];
      return [rows];
    }
    if (sql.includes('FROM property_units WHERE id = ?')) {
      return [units.filter(unit => unit.id === Number(parameters[0]))];
    }
    if (sql.includes('FROM property_units pu') && sql.includes('WHERE p.id = ? AND p.owner_id = ?')) {
      const [propertyId, ownerId] = parameters;
      return [property.id === Number(propertyId) && property.owner_id === Number(ownerId) ? units : []];
    }
    if (sql.startsWith('SELECT id FROM properties WHERE id = ? AND owner_id = ?')) {
      const [propertyId, ownerId] = parameters;
      return [property.id === Number(propertyId) && property.owner_id === Number(ownerId)
        ? [{ id: property.id }]
        : []];
    }
    if (sql.includes('SELECT p.id, p.owner_id')) return [[property]];
    if (sql.includes('FROM property_units WHERE property_id IN')) return [units];
    throw new Error(`Unexpected SQL in property-unit test: ${sql}`);
  };
  pool.execute = executeMock;
  pool.getConnection = async () => ({
    execute: executeMock,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {}
  });

  const app = express();
  app.use(express.json());
  app.use('/api/properties', publicRouter);
  app.use('/api/owner/properties', ownerRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  });
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const createdResponse = await fetch(`${baseUrl}/api/owner/properties/55/units`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'smartstay.sid=owner-token' },
    body: JSON.stringify({ name: 'Room 101' })
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.data.name, 'Room 101');
  assert.equal(created.data.availabilityStatus, 'AVAILABLE');
  assert.ok(created.data.lastConfirmedAt);
  assert.equal(units[0].availability_status, 'AVAILABLE');
  assert.equal(availabilityEvents[0].parameters[3], 'ROOM_MARKED_AVAILABLE');

  const initialFreshnessResponse = await fetch(`${baseUrl}/api/properties/55/freshness`);
  assert.equal(initialFreshnessResponse.status, 200);
  const initialFreshness = await initialFreshnessResponse.json();
  assert.equal(initialFreshness.data.availabilityStatus, 'AVAILABLE');
  assert.equal(initialFreshness.data.freshnessStatus, 'FRESH');
  assert.ok(initialFreshness.data.freshnessScore > 90);
  assert.ok(initialFreshness.data.availabilityConfidence < initialFreshness.data.freshnessScore);
  assert.equal(initialFreshness.data.requiresConfirmation, false);
  assert.deepEqual(Object.keys(initialFreshness.data).sort(), [
    'availabilityConfidence',
    'availabilityStatus',
    'freshnessScore',
    'freshnessStatus',
    'id',
    'lastConfirmedAt',
    'requiresConfirmation',
    'units'
  ]);

  const confirmationResponse = await fetch(`${baseUrl}/api/owner/properties/55/units/1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: 'smartstay.sid=owner-token' },
    body: JSON.stringify({ availabilityStatus: 'AVAILABLE' })
  });
  assert.equal(confirmationResponse.status, 200);
  assert.equal(availabilityEvents[1].parameters[3], 'OWNER_CONFIRMED_AVAILABLE');
  assert.equal(availabilityEvents[1].parameters[4], 'AVAILABLE');

  const updateResponse = await fetch(`${baseUrl}/api/owner/properties/55/units/1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: 'smartstay.sid=owner-token' },
    body: JSON.stringify({ availabilityStatus: 'OCCUPIED' })
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(units[0].availability_status, 'OCCUPIED');
  assert.equal(availabilityEvents[2].parameters[3], 'OWNER_CONFIRMED_OCCUPIED');
  assert.equal(availabilityEvents[2].parameters[4], 'AVAILABLE');
  assert.equal(availabilityEvents[2].parameters[5], 'OCCUPIED');

  const occupiedFreshnessResponse = await fetch(`${baseUrl}/api/properties/55/freshness`);
  const occupiedFreshness = await occupiedFreshnessResponse.json();
  assert.equal(occupiedFreshness.data.units[0].availabilityStatus, 'OCCUPIED');
  assert.equal(occupiedFreshness.data.units[0].freshnessStatus, 'UNAVAILABLE');
  assert.equal(occupiedFreshness.data.availabilityStatus, 'OCCUPIED');

  const unauthorizedResponse = await fetch(`${baseUrl}/api/owner/properties/55/units/1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: 'smartstay.sid=other-owner-token' },
    body: JSON.stringify({ availabilityStatus: 'AVAILABLE' })
  });
  assert.equal(unauthorizedResponse.status, 404);
  assert.equal(units[0].availability_status, 'OCCUPIED');

  const publicResponse = await fetch(`${baseUrl}/api/properties`);
  assert.equal(publicResponse.status, 200);
  const publicProperties = await publicResponse.json();
  assert.equal(publicProperties.data[0].units[0].name, 'Room 101');
  assert.equal(publicProperties.data[0].units[0].availabilityStatus, 'OCCUPIED');
});
