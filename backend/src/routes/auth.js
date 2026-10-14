const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const pool = require('../db/pool');
const { SESSION_COOKIE, hashToken, readCookie, requireAuth } = require('../middleware/require-auth');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});
const sessionTtlMs = config.sessionTtlDays * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionTtlMs
  };
}

function clearCookieOptions() {
  const { maxAge, ...options } = cookieOptions();
  return options;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ownerVerificationStatus: user.owner_verification_status
  };
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  await pool.execute(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [tokenHash, userId, expiresAt]
  );
  return token;
}

router.post('/register', authLimiter, async (req, res, next) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const requestedRole = body.role || 'tenant';

  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid name and email address.' });
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
  }
  if (!['tenant', 'owner'].includes(requestedRole)) {
    return res.status(400).json({ error: 'Registration role must be tenant or owner.' });
  }

  let connection;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, requestedRole]
    );
    await connection.commit();

    const user = {
      id: result.insertId,
      name,
      email,
      role: requestedRole,
      owner_verification_status: 'NOT_STARTED'
    };
    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, password_hash, role, owner_verification_status
       FROM users WHERE email = ? AND is_active = TRUE LIMIT 1`,
      [email]
    );
    const user = rows[0];
    const passwordMatches = user && await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  try {
    if (token) {
      await pool.execute('DELETE FROM auth_sessions WHERE token_hash = ?', [hashToken(token)]);
    }
    res.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;