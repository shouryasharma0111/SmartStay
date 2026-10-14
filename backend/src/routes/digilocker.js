const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/require-auth');
const digilockerService = require('../services/digilocker-service');

const router = express.Router();
router.use(requireAuth);

router.post('/properties/:id/verify', async (req, res, next) => {
  const propertyId = req.params.id;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (!/^\d+$/.test(propertyId)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only property owners can start verification.' });
  }
  if (body.consent !== true) {
    return res.status(400).json({ error: 'Owner consent is required to continue.' });
  }

  try {
    const [properties] = await pool.execute(
      'SELECT id, owner_id FROM properties WHERE id = ? AND owner_id = ? LIMIT 1',
      [propertyId, req.user.id]
    );
    if (!properties[0]) {
      return res.status(404).json({ error: 'Property not found for this owner.' });
    }

    const result = await digilockerService.verify({ scenario: body.demoScenario });
    const [insert] = await pool.execute(
      `INSERT INTO property_verifications
       (owner_id, property_id, provider, verification_mode, status, document_type,
        issuer, matching_result, verification_metadata, failure_reason, consented_at, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?)` ,
      [
        req.user.id,
        propertyId,
        result.provider,
        result.mode,
        result.status,
        result.documentType,
        result.issuer,
        result.matchingResult,
        JSON.stringify(result.metadata),
        result.failureReason,
        result.verifiedAt
      ]
    );

    return res.status(201).json({
      data: {
        id: insert.insertId,
        propertyId: Number(propertyId),
        provider: result.provider,
        mode: result.mode,
        status: result.status,
        documentType: result.documentType,
        issuer: result.issuer,
        matchingResult: result.matchingResult,
        failureReason: result.failureReason,
        verifiedAt: result.verifiedAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/properties/:id/status', async (req, res, next) => {
  const propertyId = req.params.id;
  if (!/^\d+$/.test(propertyId)) {
    return res.status(400).json({ error: 'Property ID must be a positive integer.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT v.id, v.property_id, v.provider, v.verification_mode, v.status,
              v.document_type, v.issuer, v.matching_result, v.failure_reason,
              v.verified_at, v.created_at
       FROM property_verifications v
       JOIN properties p ON p.id = v.property_id
       WHERE v.property_id = ? AND (p.owner_id = ? OR ? = 'admin')
       ORDER BY v.created_at DESC LIMIT 1`,
      [propertyId, req.user.id, req.user.role]
    );
    return res.json({ data: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;