const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !phone || !message) return res.status(400).json({ error: 'Missing fields' });
  if (!/^\d{10}$/.test(String(phone||''))) return res.status(400).json({ error: 'Phone must be 10 digits' });
  try {
    // If an auth token is present and role is admin, disallow posting
    const authz = req.headers['authorization'] || req.headers['Authorization'];
    if (authz && authz.startsWith('Bearer ')){
      const token = authz.slice(7);
      try{
        const dec = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (dec?.role === 'admin') return res.status(403).json({ error: 'Admins cannot post contact messages' });
      }catch{}
    }
    await pool.query('CREATE TABLE IF NOT EXISTS contact_messages (id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('INSERT INTO contact_messages (name,email,phone,message) VALUES ($1,$2,$3,$4)', [name,email,phone||null,message]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to submit contact message' }); }
});

router.get('/', auth(['admin']), async (_req, res) => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS contact_messages (id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    const r = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Failed to list messages' }); }
});

module.exports = router;
