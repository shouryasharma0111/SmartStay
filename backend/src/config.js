const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fraction(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

const freshness = {
  freshHours: positiveNumber(process.env.FRESHNESS_FRESH_HOURS, 2),
  recentlyConfirmedHours: positiveNumber(process.env.FRESHNESS_RECENT_HOURS, 6),
  confirmationRecommendedHours: positiveNumber(process.env.FRESHNESS_RECOMMENDED_HOURS, 12),
  confirmationRequiredHours: positiveNumber(process.env.FRESHNESS_REQUIRED_HOURS, 24),
  decayHalfLifeHours: positiveNumber(process.env.FRESHNESS_DECAY_HALF_LIFE_HOURS, 12),
  mismatchWindowHours: positiveNumber(process.env.FRESHNESS_MISMATCH_WINDOW_HOURS, 72),
  mismatchPenaltyPerReport: fraction(process.env.FRESHNESS_MISMATCH_PENALTY, 0.15),
  maxMismatchPenalty: fraction(process.env.FRESHNESS_MAX_MISMATCH_PENALTY, 0.6),
  bookingConflictConfidenceMultiplier: fraction(
    process.env.FRESHNESS_BOOKING_CONFLICT_MULTIPLIER,
    0.2
  )
};

if (!(freshness.freshHours <= freshness.recentlyConfirmedHours &&
      freshness.recentlyConfirmedHours <= freshness.confirmationRecommendedHours &&
      freshness.confirmationRecommendedHours < freshness.confirmationRequiredHours)) {
  throw new Error('Freshness thresholds must be ordered from fresh through confirmation required.');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: positiveInteger(process.env.PORT, 3000),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  sessionTtlDays: positiveInteger(process.env.SESSION_TTL_DAYS, 7),
  freshness,
  digilocker: {
    environment: process.env.DIGILOCKER_ENV || 'sandbox',
    clientId: process.env.DIGILOCKER_CLIENT_ID || '',
    clientSecret: process.env.DIGILOCKER_CLIENT_SECRET || '',
    redirectUri: process.env.DIGILOCKER_REDIRECT_URI || ''
  },
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: positiveInteger(process.env.MYSQL_PORT, 3306),
    database: process.env.MYSQL_DATABASE || 'smartstay',
    user: process.env.MYSQL_USER || 'smartstay_app',
    password: process.env.MYSQL_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
  },
  migrationMysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: positiveInteger(process.env.MYSQL_PORT, 3306),
    database: process.env.MYSQL_DATABASE || 'smartstay',
    user: process.env.MYSQL_MIGRATION_USER || process.env.MYSQL_USER || 'smartstay_app',
    password: process.env.MYSQL_MIGRATION_PASSWORD || process.env.MYSQL_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
    timezone: 'Z'
  }
};