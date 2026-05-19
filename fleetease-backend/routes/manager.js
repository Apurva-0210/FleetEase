const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

async function ensureDocs(){
  await pool.query(`CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'driver' | 'agent' | 'vehicle'
    entity_id INT NOT NULL,
    doc_type TEXT,            -- e.g., License, RC, Permit
    doc_number TEXT,
    expiry_date DATE,
    file_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function ensureUserCols(){
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry DATE");
}

// Summaries for manager dashboard
router.get('/summary', auth(['admin','manager']), async (_req, res) => {
  try{
    await ensureUserCols();
    // ensure fastag columns exist on vehicles
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_issuer TEXT");
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_tag_id TEXT");
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_status TEXT");
    const [drivers, agents, vehicles, docs] = await Promise.all([
      pool.query("SELECT user_id, name, email, phone, license_number, license_expiry FROM users WHERE role='driver' ORDER BY user_id DESC"),
      pool.query("SELECT user_id, name, email, phone, agent_code FROM users WHERE role='agent' ORDER BY user_id DESC"),
      pool.query('SELECT vehicle_id, vehicle_number, type, capacity, status, fastag_issuer, fastag_tag_id, fastag_status FROM vehicles ORDER BY vehicle_id DESC'),
      (async()=>{ await ensureDocs(); return pool.query('SELECT * FROM documents ORDER BY created_at DESC LIMIT 500'); })()
    ]);
    res.json({ drivers: drivers.rows, agents: agents.rows, vehicles: vehicles.rows, documents: docs.rows });
  }catch(e){ res.status(500).json({ error:'Failed to load summary' }); }
});

// Documents CRUD (no file upload, URL only)
router.get('/documents', auth(['admin','manager']), async (_req, res) => {
  try{ await ensureDocs(); const r = await pool.query('SELECT * FROM documents ORDER BY created_at DESC'); res.json(r.rows); }
  catch(e){ res.status(500).json({ error:'Failed to list documents' }); }
});

router.post('/documents', auth(['admin','manager']), async (req, res) => {
  try{
    await ensureDocs();
    const { entity_type, entity_id, doc_type, doc_number, expiry_date, file_url, notes } = req.body || {};
    if (!entity_type || !entity_id) return res.status(400).json({ error:'entity_type and entity_id required' });
    const r = await pool.query(
      `INSERT INTO documents (entity_type, entity_id, doc_type, doc_number, expiry_date, file_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [entity_type, Number(entity_id), doc_type||null, doc_number||null, expiry_date||null, file_url||null, notes||null]
    );
    res.json(r.rows[0]);
  }catch(e){ res.status(500).json({ error:'Failed to create document' }); }
});

router.put('/documents/:id', auth(['admin','manager']), async (req, res) => {
  try{
    await ensureDocs();
    const id = Number(req.params.id);
    const { doc_type, doc_number, expiry_date, file_url, notes } = req.body || {};
    const r = await pool.query(
      `UPDATE documents SET doc_type=$1, doc_number=$2, expiry_date=$3, file_url=$4, notes=$5 WHERE id=$6 RETURNING *`,
      [doc_type||null, doc_number||null, expiry_date||null, file_url||null, notes||null, id]
    );
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error:'Failed to update document' }); }
});

router.delete('/documents/:id', auth(['admin','manager']), async (req, res) => {
  try{ await ensureDocs(); await pool.query('DELETE FROM documents WHERE id=$1',[req.params.id]); res.json({ ok:true }); }
  catch(e){ res.status(500).json({ error:'Failed to delete document' }); }
});

module.exports = router;
// ---------------- Users (agents/drivers) CRUD -----------------
router.post('/users', auth(['manager','admin']), async (req, res) => {
  try{
    const { name, email, phone, password, role, license_number, license_expiry } = req.body || {};
    if (!['agent','driver'].includes(role)) return res.status(400).json({ error:'Role must be agent or driver' });
    if (!name || !email || !password) return res.status(400).json({ error:'name, email, password are required' });
    if (phone && !/^\d{10}$/.test(String(phone))) return res.status(400).json({ error:'Phone must be 10 digits' });
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry DATE");
    if (role==='driver' && !license_number) return res.status(400).json({ error:'license_number required for driver' });
    const exists = await pool.query('SELECT 1 FROM users WHERE email=$1',[email]);
    if (exists.rows.length) return res.status(409).json({ error:'Email exists' });
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (name,email,phone,role,password_hash,license_number,license_expiry) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id',
      [name, email, phone||null, role, hash, role==='driver'? (license_number||null): null, role==='driver'? (license_expiry||null) : null]
    );
    // Ensure agent_code for agents
    if (role==='agent'){
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT');
      const code = 'AG' + String(r.rows[0].user_id).padStart(6,'0');
      await pool.query('UPDATE users SET agent_code=$1 WHERE user_id=$2',[code, r.rows[0].user_id]);
    }
    res.json({ ok:true, user_id: r.rows[0].user_id });
  }catch(e){ res.status(500).json({ error:'Failed to create user' }); }
});

router.put('/users/:id', auth(['manager','admin']), async (req, res) => {
  try{
    const id = Number(req.params.id);
    const { name, email, phone, role, license_number, license_expiry } = req.body || {};
    // Only agent/driver allowed via manager
    if (role && !['agent','driver'].includes(role)) return res.status(400).json({ error:'Role must be agent or driver' });
    if (phone && !/^\d{10}$/.test(String(phone))) return res.status(400).json({ error:'Phone must be 10 digits' });
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry DATE");
    const u = await pool.query('SELECT user_id, role FROM users WHERE user_id=$1',[id]);
    if (!u.rows.length) return res.status(404).json({ error:'Not found' });
    const newRole = role || u.rows[0].role;
    if (!['agent','driver'].includes(newRole)) return res.status(400).json({ error:'Only agent/driver can be managed by manager' });
    if (newRole==='driver' && license_number===undefined){ /* keep as-is */ } else if (newRole==='driver' && !license_number){ return res.status(400).json({ error:'license_number required for driver' }); }
    await pool.query(
      'UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone), role=$4, license_number=$5, license_expiry=$6 WHERE user_id=$7',
      [name||null, email||null, phone||null, newRole, newRole==='driver'? (license_number||null) : null, newRole==='driver'? (license_expiry||null) : null, id]
    );
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to update user' }); }
});

router.delete('/users/:id', auth(['manager','admin']), async (req, res) => {
  try{
    const id = Number(req.params.id);
    const u = await pool.query('SELECT user_id, role FROM users WHERE user_id=$1',[id]);
    if (!u.rows.length) return res.json({ ok:true });
    const role = u.rows[0].role;
    if (role==='admin' || role==='manager' || role==='company_admin') return res.status(400).json({ error:'Cannot delete this role' });
    const drv = await pool.query('SELECT 1 FROM vehicles WHERE driver_user_id=$1 LIMIT 1',[id]);
    if (drv.rows.length) return res.status(400).json({ error:'Driver is assigned to a vehicle. Unassign first.' });
    const bk = await pool.query('SELECT 1 FROM bookings WHERE customer_id=$1 LIMIT 1',[id]);
    if (bk.rows.length) return res.status(400).json({ error:'User has bookings. Remove or reassign records first.' });
    const ob = await pool.query('SELECT 1 FROM offline_bookings WHERE agent_user_id=$1 LIMIT 1',[id]);
    if (ob.rows.length) return res.status(400).json({ error:'Agent has offline bookings. Remove or reassign records first.' });
    await pool.query('DELETE FROM users WHERE user_id=$1',[id]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to delete user' }); }
});
