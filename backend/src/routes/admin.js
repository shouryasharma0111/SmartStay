const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/require-auth');
const requireRole = require('../middleware/require-role');
const { buildPropertyFilters, mapProperty, propertySelect } = require('./properties');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/properties', async (req, res, next) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'ALL';
  if (!['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Unsupported property status.' });
  }

  try {
    const filters = buildPropertyFilters(req.query);
    const where = [filters.where.replace(/^WHERE\s+/i, '')].filter(Boolean);
    const parameters = [...filters.parameters];
    if (status !== 'ALL') {
      where.push('p.verification_status = ?');
      parameters.push(status);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [counts] = await pool.execute(
      'SELECT verification_status, COUNT(*) AS total FROM properties GROUP BY verification_status'
    );
    const [properties] = await pool.execute(
      `${propertySelect} ${clause} ORDER BY ${filters.sortBy}`,
      parameters
    );
    const data = properties.map(mapProperty);
    const countFor = propertyStatus => Number(
      counts.find(row => row.verification_status === propertyStatus)?.total || 0
    );
    return res.json({
      success: true,
      total: counts.reduce((total, row) => total + Number(row.total), 0),
      pendingCount: countFor('PENDING'),
      verifiedCount: countFor('VERIFIED'),
      rejectedCount: countFor('REJECTED'),
      data
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/verifications', async (req, res, next) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'ALL';
  const allowedStatuses = ['ALL', 'PENDING', 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW', 'EXPIRED'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Unsupported verification status.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT v.id, v.property_id, p.name AS property_name, u.name AS owner_name,
              v.provider, v.verification_mode, v.status, v.document_type, v.issuer,
              v.matching_result, v.failure_reason, v.verified_at, v.created_at
       FROM property_verifications v
       JOIN properties p ON p.id = v.property_id
       JOIN users u ON u.id = v.owner_id
       JOIN (
         SELECT property_id, MAX(id) AS latest_id
         FROM property_verifications GROUP BY property_id
       ) latest ON latest.latest_id = v.id
       WHERE ? = 'ALL' OR v.status = ?
       ORDER BY v.created_at DESC`,
      [status, status]
    );
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
});

router.patch('/verifications/:id', async (req, res, next) => {
  const verificationId = req.params.id;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const status = body.status;
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  if (!/^\d+$/.test(verificationId)) {
    return res.status(400).json({ error: 'Verification ID must be a positive integer.' });
  }
  if (!['VERIFIED', 'FAILED', 'MANUAL_REVIEW', 'EXPIRED'].includes(status)) {
    return res.status(400).json({ error: 'Unsupported verification decision.' });
  }
  if (['FAILED', 'MANUAL_REVIEW'].includes(status) && !reason) {
    return res.status(400).json({ error: 'A reason is required for this decision.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT id, property_id FROM property_verifications WHERE id = ? FOR UPDATE',
      [verificationId]
    );
    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Verification record not found.' });
    }
    await connection.execute(
      `UPDATE property_verifications
       SET status = ?, matching_result = ?, failure_reason = ?,
           verified_at = CASE WHEN ? = 'VERIFIED' THEN UTC_TIMESTAMP() ELSE NULL END
       WHERE id = ?`,
      [status, status === 'VERIFIED' ? 'ADMIN_REVIEWED' : null, reason || null, status, verificationId]
    );
    await connection.execute(
      `INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, details)
       VALUES (?, ?, 'property_verification', ?, ?)` ,
      [req.user.id, `DIGILOCKER_${status}`, verificationId, JSON.stringify({ reason: reason || null })]
    );
    await connection.commit();
    return res.json({ success: true, data: { id: rows[0].id, status, reason: reason || null } });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

router.patch('/properties/:id/verification', async (req, res, next) => {
  const propertyId = req.params.id;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const status = body.status;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!/^\d+$/.test(propertyId)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be VERIFIED or REJECTED.' });
  }
  if (status === 'REJECTED' && !reason) {
    return res.status(400).json({ error: 'A reason is required when rejecting a property.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [properties] = await connection.execute(
      'SELECT id, owner_id, name FROM properties WHERE id = ? FOR UPDATE',
      [propertyId]
    );
    const property = properties[0];
    if (!property) {
      await connection.rollback();
      return res.status(404).json({ error: 'Property not found.' });
    }

    await connection.execute(
      `UPDATE properties
       SET verification_status = ?, verification_reason = ?, verified_by = ?,
           verified_at = CASE WHEN ? = 'VERIFIED' THEN UTC_TIMESTAMP() ELSE NULL END
       WHERE id = ?`,
      [status, status === 'REJECTED' ? reason : null, req.user.id, status, propertyId]
    );
    await connection.execute(
      `INSERT INTO admin_audit_logs
       (actor_id, action, target_type, target_id, details)
       VALUES (?, ?, 'property', ?, ?)`,
      [req.user.id, `PROPERTY_${status}`, propertyId, JSON.stringify({ reason: reason || null })]
    );
    await connection.execute(
      `INSERT INTO notifications (user_id, notification_type, title, body)
       VALUES (?, 'PROPERTY_VERIFICATION', ?, ?)`,
      [
        property.owner_id,
        status === 'VERIFIED' ? 'Property verified' : 'Property needs changes',
        status === 'VERIFIED'
          ? `${property.name} is now visible in verified search.`
          : `${property.name} was rejected: ${reason}`
      ]
    );
    await connection.commit();
    return res.json({
      success: true,
      data: { id: property.id, verificationStatus: status, reason: reason || null }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

router.delete('/properties/:id', async (req, res, next) => {
  const propertyId = req.params.id;
  if (!/^\d+$/.test(propertyId)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [properties] = await connection.execute(
      'SELECT id, name FROM properties WHERE id = ? FOR UPDATE',
      [propertyId]
    );
    if (!properties[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Property not found.' });
    }
    await connection.execute('DELETE FROM properties WHERE id = ?', [propertyId]);
    await connection.execute(
      `INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, details)
       VALUES (?, 'PROPERTY_DELETED', 'property', ?, ?)`,
      [req.user.id, propertyId, JSON.stringify({ name: properties[0].name })]
    );
    await connection.commit();
    return res.json({ success: true, message: 'Property deleted successfully.' });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, actor_id, action, target_type, target_id, details, created_at
       FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100`
    );
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;