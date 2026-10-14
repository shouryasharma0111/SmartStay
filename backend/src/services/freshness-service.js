const { freshness: config } = require('../config');

const FRESHNESS_STATUSES = Object.freeze([
  'FRESH',
  'RECENTLY_CONFIRMED',
  'CONFIRMATION_RECOMMENDED',
  'CONFIRMATION_REQUIRED',
  'STALE',
  'UNAVAILABLE'
]);

function round(value) {
  return Math.round(value * 100) / 100;
}

function normalizeTimestamp(timestamp) {
  if (timestamp === null || timestamp === undefined) return null;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateFreshness({
  availabilityStatus,
  lastConfirmedAt,
  mismatchCount = 0,
  bookingConflict = false,
  now = new Date()
}) {
  const status = typeof availabilityStatus === 'string'
    ? availabilityStatus.toUpperCase()
    : 'UNAVAILABLE';
  const confirmedAt = normalizeTimestamp(lastConfirmedAt);
  const normalizedConfirmation = confirmedAt ? confirmedAt.toISOString() : null;

  if (status !== 'AVAILABLE') {
    return {
      availabilityStatus: status,
      freshnessScore: 0,
      freshnessStatus: 'UNAVAILABLE',
      availabilityConfidence: 0,
      lastConfirmedAt: normalizedConfirmation,
      requiresConfirmation: false
    };
  }

  const currentTime = normalizeTimestamp(now);
  const ageHours = confirmedAt && currentTime
    ? Math.max(0, (currentTime.getTime() - confirmedAt.getTime()) / 3600000)
    : Number.POSITIVE_INFINITY;
  const freshnessScore = Number.isFinite(ageHours)
    ? round(100 * (0.5 ** (ageHours / config.decayHalfLifeHours)))
    : 0;

  let freshnessStatus = 'STALE';
  if (ageHours <= config.freshHours) freshnessStatus = 'FRESH';
  else if (ageHours <= config.recentlyConfirmedHours) freshnessStatus = 'RECENTLY_CONFIRMED';
  else if (ageHours < config.confirmationRecommendedHours) {
    freshnessStatus = 'CONFIRMATION_RECOMMENDED';
  } else if (ageHours <= config.confirmationRequiredHours) {
    freshnessStatus = 'CONFIRMATION_REQUIRED';
  }

  const reports = Number.isFinite(Number(mismatchCount))
    ? Math.max(0, Number(mismatchCount))
    : 0;
  const reportPenalty = Math.min(
    config.maxMismatchPenalty,
    reports * config.mismatchPenaltyPerReport
  );
  const bookingMultiplier = bookingConflict
    ? config.bookingConflictConfidenceMultiplier
    : 1;

  return {
    availabilityStatus: status,
    freshnessScore,
    freshnessStatus,
    availabilityConfidence: round(freshnessScore * (1 - reportPenalty) * bookingMultiplier),
    lastConfirmedAt: normalizedConfirmation,
    requiresConfirmation: ageHours >= config.confirmationRecommendedHours
  };
}

function summarizePropertyFreshness({
  availabilityStatus,
  lastConfirmedAt,
  mismatchCount = 0,
  now = new Date(),
  units = []
}) {
  if (!units.length) {
    return calculateFreshness({ availabilityStatus, lastConfirmedAt, mismatchCount, now });
  }

  const availableUnits = units.filter(unit => unit.availabilityStatus === 'AVAILABLE');
  if (!availableUnits.length) {
    const status = units.some(unit => unit.availabilityStatus === 'OCCUPIED')
      ? 'OCCUPIED'
      : (units.find(unit => unit.availabilityStatus !== 'AVAILABLE')?.availabilityStatus || 'UNAVAILABLE');
    return calculateFreshness({ availabilityStatus: status, lastConfirmedAt: null, now });
  }

  const leastFresh = availableUnits.reduce((least, unit) =>
    unit.freshnessScore < least.freshnessScore ? unit : least
  );
  const confirmationTimes = availableUnits
    .map(unit => normalizeTimestamp(unit.lastConfirmedAt))
    .filter(Boolean);
  const oldestConfirmation = confirmationTimes.length
    ? new Date(Math.min(...confirmationTimes.map(date => date.getTime()))).toISOString()
    : null;

  return {
    availabilityStatus: 'AVAILABLE',
    freshnessScore: leastFresh.freshnessScore,
    freshnessStatus: leastFresh.freshnessStatus,
    availabilityConfidence: Math.min(...availableUnits.map(unit => unit.availabilityConfidence)),
    lastConfirmedAt: oldestConfirmation,
    requiresConfirmation: availableUnits.some(unit => unit.requiresConfirmation)
  };
}

module.exports = {
  FRESHNESS_STATUSES,
  calculateFreshness,
  summarizePropertyFreshness
};
