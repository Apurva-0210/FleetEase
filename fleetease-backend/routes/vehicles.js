const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// List vehicles with assigned driver info
router.get('/', auth(['admin','manager']), async (req, res) => {
  try{
    // ensure fastag columns exist
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_issuer TEXT");
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_tag_id TEXT");
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_status TEXT");
    const q = `SELECT v.*, u.user_id AS driver_user_id, u.name AS driver_name, u.email AS driver_email
               FROM vehicles v
               LEFT JOIN users u ON u.user_id = v.assigned_driver_id
               ORDER BY v.vehicle_id ASC`;
    const r = await pool.query(q);
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error: 'Failed to list vehicles' }); }
});

// Create a new vehicle
router.post('/', auth(['admin','manager']), async (req, res) => {
  try{
    const { vehicle_number, type, capacity, status } = req.body || {};
    if (!vehicle_number) return res.status(400).json({ error:'vehicle_number is required' });
    const cap = capacity!=null ? Number(capacity) : null;
    const st = status || 'available';
    const r = await pool.query(
      'INSERT INTO vehicles (vehicle_number, type, capacity, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [vehicle_number, type||null, cap, st]
    );
    res.json(r.rows[0]);
  }catch(e){ res.status(500).json({ error:'Failed to create vehicle' }); }
});

// List drivers (users with role=driver)
router.get('/drivers', auth(['admin','manager']), async (req, res) => {
  try{
    const r = await pool.query("SELECT user_id, name, email, phone FROM users WHERE role='driver' ORDER BY name");
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error: 'Failed to list drivers' }); }
});

// Assign driver to a vehicle
router.put('/:vehicle_id/assign', auth(['admin','manager']), async (req, res) => {
  try{
    const { vehicle_id } = req.params;
    const { driver_user_id } = req.body || {};
    const r = await pool.query('UPDATE vehicles SET assigned_driver_id=$1 WHERE vehicle_id=$2 RETURNING *', [driver_user_id || null, vehicle_id]);
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error: 'Failed to assign driver', details: e.message }); }
});

// Update vehicle status (e.g., active, maintenance, unavailable)
router.put('/:vehicle_id/status', auth(['admin','manager']), async (req, res) => {
  try{
    const { vehicle_id } = req.params;
    const { status } = req.body || {};
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT");
    const allowed = ['active','maintenance','unavailable'];
    const s = String(status||'').toLowerCase();
    if (!allowed.includes(s)) return res.status(400).json({ error:'Invalid status' });
    const r = await pool.query('UPDATE vehicles SET status=$1 WHERE vehicle_id=$2 RETURNING *',[s, vehicle_id]);
    res.json(r.rows[0]||null);
  }catch(e){ res.status(500).json({ error:'Failed to update status' }); }
});

// Update FASTag metadata for a vehicle
router.put('/:vehicle_id/fastag', auth(['admin','manager']), async (req, res) => {
  try{
    const { vehicle_id } = req.params;
    const { fastag_issuer, fastag_tag_id, fastag_status } = req.body || {};
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_issuer TEXT");
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_tag_id TEXT");
    await pool.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fastag_status TEXT");
    // Basic format validation hooks (can be tightened per issuer)
    const issuer = String(fastag_issuer||'').toLowerCase();
    const tag = String(fastag_tag_id||'').trim();
    if (tag){
      const genericOk = /^[A-Z0-9]{8,24}$/i.test(tag);
      let ok = genericOk;
      // Example issuer-based patterns (adjust when exact rules available)
      const patterns = {
        icici: /^[A-Z0-9]{12,24}$/i,
        axis: /^[A-Z0-9]{12,24}$/i,
        hdfc: /^[A-Z0-9]{12,24}$/i,
        idfc: /^[A-Z0-9]{12,24}$/i,
        paytm: /^[A-Z0-9]{8,24}$/i,
      };
      const key = ['icici','axis','hdfc','idfc','paytm'].find(k=> issuer.includes(k));
      if (key && patterns[key]) ok = patterns[key].test(tag);
      if (!ok) return res.status(400).json({ error:'Invalid FASTag ID format for issuer' });
    }
    const r = await pool.query(
      'UPDATE vehicles SET fastag_issuer=$1, fastag_tag_id=$2, fastag_status=$3 WHERE vehicle_id=$4 RETURNING *',
      [fastag_issuer||null, fastag_tag_id||null, fastag_status||null, vehicle_id]
    );
    res.json(r.rows[0]||null);
  }catch(e){ res.status(500).json({ error:'Failed to update FASTag meta' }); }
});

// Delete a vehicle (only if no bookings/schedules reference it)
router.delete('/:vehicle_id', auth(['admin','manager']), async (req, res) => {
  try{
    const id = Number(req.params.vehicle_id);
    const bk = await pool.query('SELECT 1 FROM bookings WHERE vehicle_id=$1 LIMIT 1',[id]);
    if (bk.rows.length) return res.status(400).json({ error:'Vehicle has bookings. Cannot delete.' });
    const sch = await pool.query('SELECT 1 FROM schedules WHERE vehicle_id=$1 LIMIT 1',[id]);
    if (sch.rows.length) return res.status(400).json({ error:'Vehicle is used in schedules. Unassign first.' });
    await pool.query('DELETE FROM vehicles WHERE vehicle_id=$1',[id]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to delete vehicle' }); }
});

module.exports = router;
