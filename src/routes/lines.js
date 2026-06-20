const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/lines — see all lines and their status
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, li.name as locked_by_name
       FROM lines l
       LEFT JOIN linemen li ON l.locked_by = li.id
       ORDER BY l.is_locked DESC`
    );
    res.json({ lines: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lines/locked — see only locked lines
router.get('/locked', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, li.name as locked_by_name, li.phone as lineman_phone
       FROM lines l
       LEFT JOIN linemen li ON l.locked_by = li.id
       WHERE l.is_locked = true
       ORDER BY l.locked_at DESC`
    );
    res.json({ 
      locked_lines: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lines/add — add a new line (supervisor only)
router.post('/add', auth, async (req, res) => {
  const { line_code, area_name, district } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO lines (line_code, area_name, district)
       VALUES ($1, $2, $3) RETURNING *`,
      [line_code, area_name, district]
    );
    res.status(201).json({ 
      message: 'Line added successfully', 
      line: result.rows[0] 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;