const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

async function ensureTables(){
  await pool.query(`CREATE TABLE IF NOT EXISTS agents (
    agent_user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    agent_code TEXT UNIQUE,
    commission_rate NUMERIC DEFAULT 0.05,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS offline_bookings (
    id SERIAL PRIMARY KEY,
    agent_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    route_id INT,
    schedule_id INT,
    seats TEXT,
    amount NUMERIC,
    payment_method VARCHAR(10) CHECK (payment_method IN ('cash','qr')) DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  // Ensure payment_method exists with default and check constraint
  await pool.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) DEFAULT 'cash'`);
  await pool.query(`ALTER TABLE offline_bookings ALTER COLUMN payment_method SET DEFAULT 'cash'`);
  await pool.query(`UPDATE offline_bookings SET payment_method='cash' WHERE payment_method IS NULL`);
  await pool.query(`DO $$ BEGIN
    BEGIN
      ALTER TABLE offline_bookings ADD CONSTRAINT offline_bookings_payment_method_check CHECK (payment_method IN ('cash','qr'));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END $$;`);
  console.log('ensureTables: offline_bookings.payment_method ensured');
}

router.get('/me', auth(['agent']), async (req, res)=>{
  try{
    await ensureTables();
    const u = await pool.query('SELECT user_id,name,email,phone,role,agent_code FROM users WHERE user_id=$1',[req.user.user_id]);
    const a = await pool.query('SELECT commission_rate, created_at FROM agents WHERE agent_user_id=$1',[req.user.user_id]);
    res.json({ ...u.rows[0], commission_rate: a.rows[0]?.commission_rate ?? 0.05 });
  }catch(e){ res.status(500).json({ error:'Failed to load agent profile' }); }
});

router.post('/ensure', auth(['agent','admin']), async (req,res)=>{
  try{
    await ensureTables();
    // Upsert agent from user if missing
    await pool.query('INSERT INTO agents (agent_user_id, agent_code) SELECT user_id, agent_code FROM users WHERE user_id=$1 ON CONFLICT (agent_user_id) DO NOTHING',[req.user.user_id]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error:'Failed to ensure agent' }); }
});

// Simple stats used by older UIs
router.get('/stats', auth(['agent']), async (req,res)=>{
  try{
    await ensureTables();
    const total = await pool.query('SELECT COUNT(*)::int AS cnt, COALESCE(SUM(amount),0)::numeric AS amt FROM offline_bookings WHERE agent_user_id=$1',[req.user.user_id]);
    const today = await pool.query("SELECT COUNT(*)::int AS cnt, COALESCE(SUM(amount),0)::numeric AS amt FROM offline_bookings WHERE agent_user_id=$1 AND created_at::date = CURRENT_DATE",[req.user.user_id]);
    res.json({ total: total.rows[0], today: today.rows[0] });
  }catch(e){ res.status(500).json({ error:'Failed to load stats' }); }
});

// Agent dashboard KPIs
router.get('/dashboard/stats', auth(['agent']), async (req, res) => {
  try {
    await ensureTables();
    const today = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM offline_bookings WHERE agent_user_id=$1 AND created_at::date = CURRENT_DATE",
      [req.user.user_id]
    );
    const customers = await pool.query("SELECT COUNT(*)::int AS cnt FROM users WHERE role='customer'");
    const vehicles = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM vehicles WHERE status IN ('available','active') OR status IS NULL"
    );
    res.json({
      todayBookings: today.rows[0]?.cnt || 0,
      pendingPayments: 0,
      totalCustomers: customers.rows[0]?.cnt || 0,
      availableBuses: vehicles.rows[0]?.cnt || 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

router.get('/bookings', auth(['agent']), async (req,res)=>{
  try{
    await ensureTables();
    const r = await pool.query('SELECT * FROM offline_bookings WHERE agent_user_id=$1 ORDER BY id DESC',[req.user.user_id]);
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error:'Failed to list offline bookings' }); }
});

// Recent bookings for dashboard
router.get('/bookings/recent', auth(['agent']), async (req, res) => {
  try {
    await ensureTables();
    const q = `
      SELECT ob.id,
             ob.customer_name,
             ob.customer_phone,
             ob.amount,
             ob.created_at,
             rt.source,
             rt.destination,
             sc.bus_number,
             v.vehicle_number
      FROM offline_bookings ob
      LEFT JOIN routes rt ON rt.route_id = ob.route_id
      LEFT JOIN schedules sc ON sc.schedule_id = ob.schedule_id
      LEFT JOIN vehicles v ON v.vehicle_id = sc.vehicle_id
      WHERE ob.agent_user_id = $1
      ORDER BY ob.created_at DESC
      LIMIT 10`;
    const r = await pool.query(q, [req.user.user_id]);
    const rows = r.rows.map(row => ({
      id: row.id,
      customerName: row.customer_name || 'Customer',
      phone: row.customer_phone || '',
      route: row.source && row.destination ? `${row.source} → ${row.destination}` : `Route ${row.route_id || ''}`,
      busNumber: row.bus_number || row.vehicle_number || '',
      date: row.created_at,
      status: 'confirmed',
      amount: Number(row.amount || 0),
    }));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load recent bookings' });
  }
});

// Upcoming trips list for dashboard
router.get('/trips/upcoming', auth(['agent']), async (_req, res) => {
  try {
    const q = `
      SELECT sc.schedule_id,
             sc.departure,
             rt.source,
             rt.destination,
             rt.distance_km,
             rt.fare_per_km,
             sc.bus_number,
             v.vehicle_number,
             v.capacity
      FROM schedules sc
      JOIN routes rt ON rt.route_id = sc.route_id
      LEFT JOIN vehicles v ON v.vehicle_id = sc.vehicle_id
      WHERE sc.departure >= NOW()
      ORDER BY sc.departure ASC
      LIMIT 10`;
    const r = await pool.query(q);
    const rows = r.rows.map(row => ({
      id: row.schedule_id,
      routeName: `${row.source} → ${row.destination}`,
      busNumber: row.bus_number || row.vehicle_number || '',
      availableSeats: row.capacity || 40,
      departureTime: row.departure,
      source: row.source,
      destination: row.destination,
    }));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load upcoming trips' });
  }
});

// Seats already taken for a schedule (offline bookings only)
router.get('/seats/:schedule_id', auth(['agent']), async (req,res)=>{
  try{
    await ensureTables();
    const r = await pool.query('SELECT seats FROM offline_bookings WHERE schedule_id=$1',[req.params.schedule_id]);
    const set = new Set();
    for (const row of r.rows){
      String(row.seats||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(s=> set.add(s));
    }
    res.json(Array.from(set));
  }catch(e){ res.status(500).json({ error:'Failed to load seats' }); }
});

router.post('/book', auth(['agent']), async (req,res)=>{
  try{
    await ensureTables();
    const { customer_name, customer_phone, route_id, schedule_id, seats, amount, payment_method } = req.body || {};
    if (!customer_name || !customer_phone || !schedule_id || !seats || amount==null) return res.status(400).json({ error:'Missing fields' });
    if (!/^\d{10}$/.test(String(customer_phone||''))) return res.status(400).json({ error:'Phone must be 10 digits' });
    const pay = (payment_method==='qr'?'qr':'cash');
    const schId = Number(schedule_id);
    const amt = Number(amount);
    if (!Number.isFinite(schId) || schId<=0) return res.status(400).json({ error:'Invalid schedule_id' });
    if (!Number.isFinite(amt) || amt<0) return res.status(400).json({ error:'Invalid amount' });
    const seatsStr = Array.isArray(seats)? seats.join(',') : String(seats);
    const cname = String(customer_name).trim();
    const cphone = String(customer_phone).trim();
    const r = await pool.query('INSERT INTO offline_bookings (agent_user_id,customer_name,customer_phone,route_id,schedule_id,seats,amount,payment_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[
      req.user.user_id, cname, cphone, route_id || null, schId, seatsStr, amt, pay
    ]);
    // emit realtime update to schedule room
    try{ const io = req.app.get('io'); io && io.to(`schedule_${schId}`).emit('seats_updated'); }catch{}
    res.json({ ok:true, booking: r.rows[0] });
  }catch(e){ console.error('Agent book error:', e); res.status(500).json({ error:'Failed to create offline booking', details: e.message }); }
});

module.exports = router;
