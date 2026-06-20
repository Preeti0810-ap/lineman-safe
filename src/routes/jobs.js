const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// POST /api/jobs/start — lineman going UP
router.post('/start', auth, async (req, res) => {
  const { line_id, location_lat, location_lng } = req.body;
  const lineman_id = req.user.id;

  try {
    // Check if line is already locked
    const line = await pool.query(
      `SELECT * FROM lines WHERE id = $1`,
      [line_id]
    );

    if (line.rows.length === 0)
      return res.status(404).json({ error: 'Line not found' });

    if (line.rows[0].is_locked)
      return res.status(400).json({ 
        error: 'Line is already locked by another lineman' 
      });

    // Lock the line
    await pool.query(
      `UPDATE lines SET is_locked = true, locked_by = $1, locked_at = NOW()
       WHERE id = $2`,
      [lineman_id, line_id]
    );

    // Create job record
    const job = await pool.query(
      `INSERT INTO jobs (lineman_id, line_id, location_lat, location_lng, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [lineman_id, line_id, location_lat, location_lng]
    );

    res.status(201).json({
      message: '🔒 Line locked. Stay safe!',
      job: job.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/complete — lineman coming DOWN safely
router.post('/complete', auth, async (req, res) => {
  const { job_id } = req.body;
  const lineman_id = req.user.id;

  try {
    // Get the job
    const job = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND lineman_id = $2`,
      [job_id, lineman_id]
    );

    if (job.rows.length === 0)
      return res.status(404).json({ error: 'Job not found' });

    if (job.rows[0].status === 'completed')
      return res.status(400).json({ error: 'Job already completed' });

    // Unlock the line
    await pool.query(
      `UPDATE lines SET is_locked = false, locked_by = null, locked_at = null
       WHERE id = $1`,
      [job.rows[0].line_id]
    );

    // Complete the job
    const updated = await pool.query(
      `UPDATE jobs SET status = 'completed', completed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [job_id]
    );

    res.json({
      message: '✅ Line unlocked. Welcome back safely!',
      job: updated.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/active — see all active jobs (for supervisor)
router.get('/active', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, l.name as lineman_name, li.line_code, li.area_name
       FROM jobs j
       JOIN linemen l ON j.lineman_id = l.id
       JOIN lines li ON j.line_id = li.id
       WHERE j.status = 'active'
       ORDER BY j.started_at DESC`
    );
    res.json({ active_jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/jobs/sos — emergency alert
router.post('/sos', auth, async (req, res) => {
  const { job_id, description } = req.body;
  const lineman_id = req.user.id;

  try {
    // Find active job
    const job = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND lineman_id = $2 AND status = 'active'`,
      [job_id, lineman_id]
    );

    if (job.rows.length === 0)
      return res.status(404).json({ error: 'No active job found' });

    // Record incident
    const incident = await pool.query(
      `INSERT INTO incidents (job_id, type, description)
       VALUES ($1, 'SOS', $2) RETURNING *`,
      [job_id, description || 'EMERGENCY - Lineman needs help!']
    );

    res.status(201).json({
      message: '🚨 SOS RECORDED! Supervisor has been alerted!',
      incident: incident.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;