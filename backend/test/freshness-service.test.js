const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateFreshness,
  summarizePropertyFreshness
} = require('../src/services/freshness-service');

const now = new Date('2026-10-07T12:00:00.000Z');

function confirmed(hoursAgo) {
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
}

test('freshness decays smoothly and moves through configured time bands', () => {
  const cases = [
    [0, 'FRESH', false],
    [2, 'FRESH', false],
    [6, 'RECENTLY_CONFIRMED', false],
    [10, 'CONFIRMATION_RECOMMENDED', false],
    [12, 'CONFIRMATION_REQUIRED', true],
    [24, 'CONFIRMATION_REQUIRED', true],
    [30, 'STALE', true]
  ];
  const results = cases.map(([hours, expectedStatus, expectedConfirmation]) => {
    const result = calculateFreshness({
      availabilityStatus: 'AVAILABLE',
      lastConfirmedAt: confirmed(hours),
      now
    });
    assert.equal(result.freshnessStatus, expectedStatus);
    assert.equal(result.requiresConfirmation, expectedConfirmation);
    assert.equal(result.lastConfirmedAt, confirmed(hours).toISOString());
    return result;
  });

  for (let index = 1; index < results.length; index += 1) {
    assert.ok(results[index].freshnessScore < results[index - 1].freshnessScore);
  }
  assert.equal(results[0].freshnessScore, 100);
  assert.ok(results.at(-1).freshnessScore < 20);
});

test('confirmation recommendation does not itself require owner action', () => {
  const result = calculateFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(8),
    now
  });
  assert.equal(result.freshnessStatus, 'CONFIRMATION_RECOMMENDED');
  assert.equal(result.requiresConfirmation, false);
});

test('missing and invalid confirmation timestamps fail closed as stale', () => {
  for (const lastConfirmedAt of [null, 'not-a-date']) {
    const result = calculateFreshness({ availabilityStatus: 'AVAILABLE', lastConfirmedAt, now });
    assert.equal(result.freshnessStatus, 'STALE');
    assert.equal(result.freshnessScore, 0);
    assert.equal(result.requiresConfirmation, true);
  }
});

test('unavailable states take priority over freshness', () => {
  for (const availabilityStatus of ['OCCUPIED', 'RESERVED', 'CONFIRMATION_REQUIRED']) {
    const result = calculateFreshness({
      availabilityStatus,
      lastConfirmedAt: confirmed(0),
      now
    });
    assert.equal(result.freshnessStatus, 'UNAVAILABLE');
    assert.equal(result.freshnessScore, 0);
    assert.equal(result.availabilityConfidence, 0);
    assert.equal(result.requiresConfirmation, false);
  }
});

test('recent mismatch reports and booking conflicts reduce confidence, not freshness', () => {
  const baseline = calculateFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(1),
    now
  });
  const reported = calculateFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(1),
    mismatchCount: 2,
    now
  });
  const conflict = calculateFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(1),
    bookingConflict: true,
    now
  });
  assert.equal(reported.freshnessScore, baseline.freshnessScore);
  assert.ok(Math.abs(reported.availabilityConfidence - baseline.availabilityConfidence * 0.7) < 0.01);
  assert.equal(conflict.freshnessScore, baseline.freshnessScore);
  assert.ok(conflict.availabilityConfidence < reported.availabilityConfidence);

  const propertySignal = summarizePropertyFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(1),
    mismatchCount: 1,
    now
  });
  assert.equal(propertySignal.freshnessScore, baseline.freshnessScore);
  assert.ok(propertySignal.availabilityConfidence < baseline.availabilityConfidence);
});

test('property summary uses the least fresh available unit and never marks occupied units fresh', () => {
  const availableFresh = calculateFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(1),
    now
  });
  const availableOld = calculateFreshness({
    availabilityStatus: 'AVAILABLE',
    lastConfirmedAt: confirmed(18),
    now
  });
  const property = summarizePropertyFreshness({
    availabilityStatus: 'OCCUPIED',
    lastConfirmedAt: confirmed(0),
    units: [
      { ...availableFresh, id: 1 },
      { ...availableOld, id: 2 },
      { ...calculateFreshness({ availabilityStatus: 'OCCUPIED', lastConfirmedAt: confirmed(0), now }), id: 3 }
    ]
  });
  assert.equal(property.availabilityStatus, 'AVAILABLE');
  assert.equal(property.freshnessScore, availableOld.freshnessScore);
  assert.equal(property.freshnessStatus, 'CONFIRMATION_REQUIRED');
  assert.equal(property.requiresConfirmation, true);

  const unavailable = summarizePropertyFreshness({
    availabilityStatus: 'AVAILABLE',
    units: [{ ...calculateFreshness({ availabilityStatus: 'OCCUPIED', lastConfirmedAt: confirmed(0), now }) }]
  });
  assert.equal(unavailable.availabilityStatus, 'OCCUPIED');
  assert.equal(unavailable.freshnessStatus, 'UNAVAILABLE');
});
