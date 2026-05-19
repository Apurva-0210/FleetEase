const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const bcrypt = require('bcrypt');
const router = express.Router();

async function ensureRoleSupportsManager(){
  // Best-effort fixes; ignore errors if not applicable
  try{ await pool.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager'"); }catch{}
  try{ await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check'); }catch{}
  try{ await pool.query("ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::text"); }catch{}
}

// List users (admin)
router.get('/', auth(['admin']), async (_req, res) => {
  try{
    const r = await pool.query('SELECT user_id, name, email, phone, role, agent_code, created_at FROM users ORDER BY user_id DESC');
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error:'Failed to list users' }); }
});

// Create managed user (agent / manager / driver) — admin only
router.post('/', auth(['admin']), async (req, res) => {
  try{
    await ensureRoleSupportsManager();
    const { name, email, phone, password, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error:'Name, email and password are required' });
    const allowed = ['agent','manager','driver'];
    if (!allowed.includes(role)) return res.status(400).json({ error:'Role must be agent, manager or driver' });
    const exists = await pool.query('SELECT 1 FROM users WHERE email=$1',[email]);
    if (exists.rows.length) return res.status(409).json({ error:'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query('INSERT INTO users (name,email,phone,role,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING user_id, name, email, phone, role, created_at',[name,email,phone||null,role,hash]);
    res.status(201).json(r.rows[0]);
  }catch(e){ res.status(500).json({ error:'Failed to create user' }); }
});

// Update role (admin)
router.put('/:id/role', auth(['admin']), async (req, res) => {
  try{
    await ensureRoleSupportsManager();
    const id = Number(req.params.id);
    const { role } = req.body || {};
    const allowed = ['agent','manager','driver'];
    if (!allowed.includes(role)) return res.status(400).json({ error:'Invalid role' });
    await pool.query('UPDATE users SET role=$1 WHERE user_id=$2', [role, id]);
    // Ensure agent_code exists for agents
    if (role === 'agent'){
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT');
      const u = await pool.query('SELECT agent_code FROM users WHERE user_id=$1',[id]);
      if (!u.rows[0]?.agent_code){
        const code = 'AG' + String(id).padStart(6,'0');
        await pool.query('UPDATE users SET agent_code=$1 WHERE user_id=$2',[code, id]);
      }
    }
    const r = await pool.query('SELECT user_id, name, email, phone, role, agent_code, created_at FROM users WHERE user_id=$1',[id]);
    res.json(r.rows[0]||null);
  }catch(e){ res.status(500).json({ error:'Failed to update role' }); }
});

// Delete user (admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try{
    const id = Number(req.params.id);
    // Load user and role
    const u = await pool.query('SELECT user_id, role FROM users WHERE user_id=$1',[id]);
    if (!u.rows.length) return res.json({ ok:true });
    const role = u.rows[0].role;
    if (role === 'admin') return res.status(400).json({ error:'Cannot delete admin accounts' });
    // Prevent deleting driver assigned to a vehicle
    const drv = await pool.query('SELECT 1 FROM vehicles WHERE driver_user_id=$1 LIMIT 1',[id]);
    if (drv.rows.length) return res.status(400).json({ error:'Driver is assigned to a vehicle. Unassign first.' });
    // Prevent deleting customers with bookings
    const bk = await pool.query('SELECT 1 FROM bookings WHERE customer_id=$1 LIMIT 1',[id]);
    if (bk.rows.length) return res.status(400).json({ error:'User has bookings. Remove or reassign records first.' });
    // Prevent deleting agents with offline bookings
    const ob = await pool.query('SELECT 1 FROM offline_bookings WHERE agent_user_id=$1 LIMIT 1',[id]);
    if (ob.rows.length) return res.status(400).json({ error:'Agent has offline bookings. Remove or reassign records first.' });
    await pool.query('DELETE FROM users WHERE user_id=$1', [id]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to delete user' }); }
});

// Seed a default manager account (admin only)
router.post('/seed-manager', auth(['admin']), async (_req, res) => {
  try{
    await ensureRoleSupportsManager();
    const email = 'manager@fleetease.com';
    const name = 'Fleet Manager';
    const phone = '9999999999';
    const password = 'manager123';
    const exists = await pool.query('SELECT user_id FROM users WHERE email=$1',[email]);
    if (exists.rows.length){
      await pool.query("UPDATE users SET role='manager' WHERE email=$1", [email]);
      return res.json({ ok:true, seeded:false, email, password });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name,email,phone,role,password_hash) VALUES ($1,$2,$3,$4,$5)', [name, email, phone, 'manager', hash]);
    res.json({ ok:true, seeded:true, email, password });
  }catch(e){ res.status(500).json({ error:'Failed to seed manager' }); }
});

module.exports = router;
