const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    if (!/^\d{10}$/.test(String(phone||''))) return res.status(400).json({ error:'Phone must be 10 digits' });
    // Ensure driver license columns exist (stored on users table for simplicity)
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry DATE");
    // Public register is CUSTOMER-ONLY. Ignore any provided non-customer role.
    const role = 'customer';
    const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email exists' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name,email,phone,role,password_hash,license_number,license_expiry) VALUES ($1,$2,$3,$4,$5,$6,$7)', [name,email,phone,role,hash, null, null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Register failed' }); }
});

router.post('/login', async (req, res) => {
  console.log("Login route hit");
  console.log(req.body);
  const { email, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid' });
    const u = r.rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid' });
    // Ensure agent_code column exists and generate for agent users if missing
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT');
    let agentCode = u.agent_code || null;
    if (u.role === 'agent' && !agentCode) {
      agentCode = 'AG' + String(u.user_id).padStart(6, '0');
      await pool.query('UPDATE users SET agent_code=$1 WHERE user_id=$2', [agentCode, u.user_id]);
    }
    const token = jwt.sign({ user_id: u.user_id, role: u.role, email: u.email, agent_code: agentCode }, process.env.JWT_SECRET || 'changeme', { expiresIn: '1d' });
    const user = { user_id: u.user_id, name: u.name, email: u.email, role: u.role, phone: u.phone };
    res.status(200).json({ success: true, token, user });
  } catch (e) { console.error("Login error:", e); res.status(500).json({ error: 'Login failed' }); }
});

module.exports = router;

// Current user profile
router.get('/me', auth(['admin','customer','driver','company_admin','agent','manager']), async (req, res) => {
  try{
    // Allow all roles to view own profile, including agent
    const r = await pool.query('SELECT user_id, name, email, phone, role, points, created_at, agent_code FROM users WHERE user_id=$1', [req.user.user_id]);
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error: 'Failed to load profile' }); }
});

// Request password reset token (email delivery is simulated via server console)
router.post('/forgot', async (req, res) => {
  try{
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email required' });
    const u = await pool.query('SELECT user_id, email FROM users WHERE email=$1', [email]);
    // Always respond ok to avoid user enumeration
    if (!u.rows.length) return res.json({ ok:true });
    await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
      token TEXT PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000*60*30); // 30 minutes
    await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)', [u.rows[0].user_id, token, expires]);
    console.log(`[RESET] Password reset token for ${email}: ${token}`);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to start reset' }); }
});

// Reset password using token
router.post('/reset', async (req, res) => {
  try{
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error:'Token and password required' });
    await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
      token TEXT PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const r = await pool.query('SELECT user_id, expires_at FROM password_reset_tokens WHERE token=$1', [token]);
    if (!r.rows.length) return res.status(400).json({ error:'Invalid or expired token' });
    if (new Date(r.rows[0].expires_at).getTime() < Date.now()){
      await pool.query('DELETE FROM password_reset_tokens WHERE token=$1', [token]);
      return res.status(400).json({ error:'Invalid or expired token' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE user_id=$2', [hash, r.rows[0].user_id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE token=$1', [token]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to reset password' }); }
});
