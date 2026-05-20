const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      name TEXT,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      bus_condition INT,
      cleanliness INT,
      driver_behaviour INT,
      punctuality INT,
      comfort INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Backfill columns if table pre-existed
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS bus_condition INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS cleanliness INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS driver_behaviour INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS punctuality INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS comfort INT');
    const result = await pool.query('SELECT * FROM testimonials ORDER BY id DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.post('/', async (req, res) => {
  const { name, rating, comment, bus_condition, cleanliness, driver_behaviour, punctuality, comfort } = req.body;
  if (!name || !rating || !comment) return res.status(400).json({ error: 'Missing fields' });
  try {
    // If an auth token is present and role is admin, disallow posting
    const authz = req.headers['authorization'] || req.headers['Authorization'];
    if (authz && authz.startsWith('Bearer ')){
      const token = authz.slice(7);
      try{
        const dec = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (dec?.role === 'admin') return res.status(403).json({ error: 'Admins cannot post testimonials' });
      }catch{}
    }
    // Ensure table exists for POST as well + columns
    await pool.query(`CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      name TEXT,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      bus_condition INT,
      cleanliness INT,
      driver_behaviour INT,
      punctuality INT,
      comfort INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS bus_condition INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS cleanliness INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS driver_behaviour INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS punctuality INT');
    await pool.query('ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS comfort INT');
    const r = await pool.query(
      'INSERT INTO testimonials (name,rating,comment,bus_condition,cleanliness,driver_behaviour,punctuality,comfort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, rating, comment, bus_condition ?? null, cleanliness ?? null, driver_behaviour ?? null, punctuality ?? null, comfort ?? null]
    );
    res.json({ ok: true, item: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add testimonial', details: e.message });
  }
});

// Clear all testimonials (admin only)
router.delete('/', auth(['admin']), async (_req, res) => {
  try {
    await pool.query('DELETE FROM testimonials');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to clear testimonials' }); }
});

module.exports = router;
