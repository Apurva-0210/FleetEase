const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

const RATES = {
  per_day: { '2x2': 12000, '2x1_sleeper': 16000, luxury: 20000, mini: 9000 },
  per_km: { '2x2': 28, '2x1_sleeper': 34, luxury: 40, mini: 22 },
  driver_allowance_per_day: 800,
  permit_per_day: 1200,
  return_trip_discount_pct: 10,
  taxes_gst_pct: 0,
};

async function ensureTable(){
  await pool.query(`CREATE TABLE IF NOT EXISTS corporate_bookings (
    id SERIAL PRIMARY KEY,
    company_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    itinerary JSONB NOT NULL,
    trip_type TEXT NOT NULL,
    bus_type TEXT NOT NULL,
    passengers_count INT,
    start_date DATE,
    end_date DATE,
    travel_days INT,
    estimated_breakdown JSONB,
    estimated_total NUMERIC,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    approved_at TIMESTAMP,
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_vehicle_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

function computeQuote({ itinerary = [], trip_type = 'oneway', bus_type = '2x2', travel_days = 1 }){
  const total_km = (Array.isArray(itinerary)? itinerary:[]).reduce((s,l)=> s + (Number(l.distance_km)||0), 0);
  const per_day = RATES.per_day[bus_type] ?? RATES.per_day['2x2'];
  const per_km = RATES.per_km[bus_type] ?? RATES.per_km['2x2'];
  const base = per_day * Math.max(1, Number(travel_days)||1);
  const km_cost = per_km * total_km;
  const driver = RATES.driver_allowance_per_day * Math.max(1, Number(travel_days)||1);
  const permit = RATES.permit_per_day * Math.max(1, Number(travel_days)||1);
  let subtotal = base + km_cost + driver + permit;
  if (trip_type === 'return') subtotal = subtotal * (1 - RATES.return_trip_discount_pct/100);
  const taxes = subtotal * (RATES.taxes_gst_pct/100);
  const total = Math.round((subtotal + taxes) * 100) / 100;
  return { total_km, breakdown: { base_per_day: per_day, per_km, driver_allowance_per_day: RATES.driver_allowance_per_day, permit_per_day: RATES.permit_per_day, return_discount_pct: trip_type==='return'? RATES.return_trip_discount_pct: 0, taxes_pct: RATES.taxes_gst_pct, subtotal: Math.round(subtotal*100)/100, taxes: Math.round(taxes*100)/100 }, total };
}

// Quote endpoint
router.post('/quote', auth(['company_admin','admin']), async (req, res) => {
  try{
    const { itinerary, trip_type, bus_type, travel_days } = req.body || {};
    const q = computeQuote({ itinerary, trip_type, bus_type, travel_days });
    res.json(q);
  }catch(e){ res.status(500).json({ error:'Failed to compute quote' }); }
});

// Create corporate booking request (pending)
router.post('/', auth(['company_admin']), async (req, res) => {
  try{
    await ensureTable();
    const { itinerary, trip_type, bus_type, passengers_count, start_date, end_date, travel_days } = req.body || {};
    const quote = computeQuote({ itinerary, trip_type, bus_type, travel_days });
    const r = await pool.query(
      `INSERT INTO corporate_bookings (company_user_id, itinerary, trip_type, bus_type, passengers_count, start_date, end_date, travel_days, estimated_breakdown, estimated_total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending') RETURNING *`,
       [req.user.user_id, JSON.stringify(itinerary||[]), trip_type||'oneway', bus_type||'2x2', passengers_count||null, start_date||null, end_date||null, travel_days||1, JSON.stringify(quote.breakdown), quote.total]
    );
    res.json(r.rows[0]);
  }catch(e){ res.status(500).json({ error:'Failed to create corporate booking', details: e.message }); }
});

// List corporate bookings (admin)
router.get('/', auth(['admin']), async (req, res) => {
  try{
    await ensureTable();
    const status = req.query.status;
    const r = await pool.query(`SELECT * FROM corporate_bookings ${status? 'WHERE status=$1' : ''} ORDER BY created_at DESC`, status? [status] : []);
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error:'Failed to list' }); }
});

// My corporate bookings (company_admin)
router.get('/mine', auth(['company_admin']), async (req, res) => {
  try{
    await ensureTable();
    const r = await pool.query('SELECT * FROM corporate_bookings WHERE company_user_id=$1 ORDER BY created_at DESC',[req.user.user_id]);
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error:'Failed to list' }); }
});

router.get('/:id', auth(['admin','company_admin']), async (req, res) => {
  try{
    await ensureTable();
    const r = await pool.query('SELECT * FROM corporate_bookings WHERE id=$1',[req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Not found' });
    if (req.user.role==='company_admin' && r.rows[0].company_user_id !== req.user.user_id) return res.status(403).json({ error:'Forbidden' });
    res.json(r.rows[0]);
  }catch(e){ res.status(500).json({ error:'Failed' }); }
});

router.put('/:id/approve', auth(['admin']), async (req, res) => {
  try{
    await ensureTable();
    const { assigned_vehicle_id, admin_notes } = req.body || {};
    const r = await pool.query(
      `UPDATE corporate_bookings SET status='approved', approved_at=NOW(), approved_by=$1, admin_notes=$2, assigned_vehicle_id=$3 WHERE id=$4 RETURNING *`,
      [req.user.user_id, admin_notes||null, assigned_vehicle_id||null, req.params.id]
    );
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error:'Failed to approve' }); }
});

router.put('/:id/reject', auth(['admin']), async (req, res) => {
  try{
    await ensureTable();
    const { admin_notes } = req.body || {};
    const r = await pool.query(`UPDATE corporate_bookings SET status='rejected', approved_at=NULL, approved_by=NULL, admin_notes=$1 WHERE id=$2 RETURNING *`, [admin_notes||null, req.params.id]);
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error:'Failed to reject' }); }
});

module.exports = router;
