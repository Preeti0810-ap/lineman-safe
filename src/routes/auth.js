const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register-lineman
router.post('/register-lineman', async (req, res) => {
  const { name, phone, employee_id, password } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO linemen (name, phone, employee_id, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, name, phone, employee_id`,
      [name, phone, employee_id, password_hash]
    );
    res.status(201).json({ message: 'Lineman registered', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-lineman
router.post('/login-lineman', async (req, res) => {
  const { employee_id, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM linemen WHERE employee_id = $1`,
      [employee_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Lineman not found' });

    const lineman = result.rows[0];
    const valid = await bcrypt.compare(password, lineman.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign(
  { id: lineman.id, role: 'lineman' },
  'linemanSafe2024secretKey',
  { expiresIn: '8h' }
   );
    res.json({ message: 'Login successful', token, name: lineman.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register-supervisor
router.post('/register-supervisor', async (req, res) => {
  const { name, phone, employee_id, password } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO supervisors (name, phone, employee_id, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, name, phone, employee_id`,
      [name, phone, employee_id, password_hash]
    );
    res.status(201).json({ message: 'Supervisor registered', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-supervisor
router.post('/login-supervisor', async (req, res) => {
  const { employee_id, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM supervisors WHERE employee_id = $1`,
      [employee_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Supervisor not found' });

    const supervisor = result.rows[0];
    const valid = await bcrypt.compare(password, supervisor.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign(
  { id: supervisor.id, role: 'supervisor' },
  'linemanSafe2024secretKey',
  { expiresIn: '8h' }
);
    res.json({ message: 'Login successful', token, name: supervisor.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;