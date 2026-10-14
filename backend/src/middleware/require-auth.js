const crypto = require('node:crypto');
const pool = require('../db/pool');

const SESSION_COOKIE = 'smartstay.sid';

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() !== name) continue;

    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function requireAuth(req, res, next) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.owner_verification_status
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = TRUE
       LIMIT 1`,
      [hashToken(token)]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    req.user = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
      ownerVerificationStatus: rows[0].owner_verification_status
    };
    req.sessionTokenHash = hashToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { SESSION_COOKIE, hashToken, readCookie, requireAuth };