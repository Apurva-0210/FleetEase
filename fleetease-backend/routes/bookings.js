const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM bookings ORDER BY booking_id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Failed to list bookings' }); }
});

// Logged-in customer's bookings (for My Bookings page)
router.get('/my', auth(['customer']), async (req, res) => {
  try {
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    const r = await pool.query(
      `SELECT booking_id, route_id, pickup_location, drop_location, status, fare, booking_time
       FROM bookings
       WHERE customer_id = $1
       ORDER BY booking_id DESC`,
      [req.user.user_id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Failed to load my bookings' }); }
});

router.post('/', auth(['admin','customer','company_admin']), async (req, res) => {
  const { customer_id, vehicle_id, route_id, schedule_id, pickup_location, drop_location, fare, booking_type } = req.body;
  try {
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS schedule_id INT");
    const r = await pool.query(
      `INSERT INTO bookings (customer_id, vehicle_id, route_id, schedule_id, pickup_location, drop_location, fare, booking_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customer_id, vehicle_id, route_id, schedule_id || null, pickup_location, drop_location, fare, booking_type || 'B2C']
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Failed to create booking' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM bookings WHERE booking_id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch booking' }); }
});

// Get seats and passenger details for a booking
router.get('/:id/seats', async (req, res) => {
  try{
    const bid = Number(req.params.id);
    if (!Number.isFinite(bid)) return res.status(400).json({ error:'Invalid booking id' });

    // Primary source: booking_seats table (new flow)
    const r = await pool.query('SELECT * FROM booking_seats WHERE booking_id=$1 ORDER BY id', [bid]);
    let seats = Array.isArray(r.rows) ? [...r.rows] : [];

    // Also look for legacy CSV seat columns on bookings to support older data
    const colsQ = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='bookings' AND column_name IN ('seats','seat_labels','selected_seats','seat_numbers')
    `);
    const csvCols = colsQ.rows.map(x=> x.column_name);
    if (csvCols.length){
      const selectCols = csvCols.map(c=> `COALESCE(${c}, '') AS ${c}`).join(',');
      const bq = await pool.query(`SELECT ${selectCols} FROM bookings WHERE booking_id=$1`, [bid]);
      if (bq.rows[0]){
        for (const c of csvCols){
          const raw = bq.rows[0][c];
          if (!raw) continue;
          String(raw).split(',').map(s=>s.trim()).filter(Boolean).forEach((lab, idx)=>{
            seats.push({
              id: `${c}-${idx}`,
              booking_id: bid,
              seat_label: lab,
              price: null,
              status: null,
              passenger_name: null,
              passenger_age: null,
              passenger_gender: null,
            });
          });
        }
      }
    }

    res.json(seats);
  }catch(e){
    res.status(500).json({ error: 'Failed to fetch booking seats' });
  }
});

// Save selected seats for a booking (B2C)
router.post('/:id/seats', auth(['admin','customer','company_admin']), async (req, res) => {
  try {
    const { seats, prices, passengers } = req.body || {};
    const bookingId = req.params.id;
    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'seats array required' });
    }
    // Insert seats
    for (let i=0; i<seats.length; i++) {
      const label = seats[i];
      const price = Array.isArray(prices) ? (prices[i] || 0) : 0;
      const p = Array.isArray(passengers) ? passengers[i] || {} : {};
      await pool.query(
        'INSERT INTO booking_seats (booking_id, seat_label, price, status, passenger_name, passenger_age, passenger_gender) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [bookingId, label, price, 'held', p.name || null, p.age ? Number(p.age) : null, p.gender || null]
      );
    }
    const r = await pool.query('SELECT * FROM booking_seats WHERE booking_id=$1 ORDER BY id', [bookingId]);
    // Emit realtime update to schedule room if available
    try{
      const br = await pool.query('SELECT schedule_id FROM bookings WHERE booking_id=$1',[bookingId]);
      const sid = br.rows[0]?.schedule_id;
      if (sid){ const io = req.app.get('io'); io && io.to(`schedule_${sid}`).emit('seats_updated'); }
    }catch{}
    res.json({ ok:true, seats: r.rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save seats', details: e.message });
  }
});

// Cancel booking with refund policy
router.post('/:id/cancel', auth(['admin','customer','company_admin']), async (req, res) => {
  try{
    const id = req.params.id;
    // Ensure columns
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT");
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP");
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT");
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_user INT");
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT");
    await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC");
    await pool.query(`CREATE TABLE IF NOT EXISTS refunds (
      id SERIAL PRIMARY KEY,
      booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const br = await pool.query('SELECT * FROM bookings WHERE booking_id=$1', [id]);
    if (!br.rows.length) return res.status(404).json({ error:'Not found' });
    const bk = br.rows[0];
    // Customer can only cancel own booking
    if (req.user.role==='customer' && bk.customer_id && bk.customer_id !== req.user.user_id){
      return res.status(403).json({ error:'Forbidden' });
    }
    if (bk.status === 'cancelled') return res.json({ ok:true, booking: bk });

    // Compute refund: Rs 25 fixed fee deduction except bus-cancelled path
    const schedule = await pool.query('SELECT departure,status FROM schedules WHERE schedule_id=$1',[bk.schedule_id]);
    const dep = schedule.rows[0]?.departure ? new Date(schedule.rows[0].departure) : null;
    const now = new Date();
    let pct = 0;
    if (dep){
      const hours = (dep.getTime() - now.getTime()) / (1000*60*60);
      if (hours > 24) pct = 1.0;
      else if (hours >= 12) pct = 0.5;
      else pct = 0.0;
    }
    // Refund base is fare, deduct Rs 25 fee if any refund > 0
    const base = Number(bk.fare || 0);
    let refund = Math.max(0, Math.round((base * pct - 25) * 100) / 100);
    if (pct === 0) refund = 0; // no refund

    const reason = String(req.body?.reason || 'User requested');
    await pool.query('UPDATE bookings SET status=$1, cancelled_at=NOW(), cancelled_by_role=$2, cancelled_by_user=$3, cancel_reason=$4, refund_amount=$5 WHERE booking_id=$6',[
      'cancelled', req.user.role, req.user.user_id, reason, refund, id
    ]);
    // Release seats
    await pool.query('DELETE FROM booking_seats WHERE booking_id=$1',[id]);
    // Emit realtime update if schedule known
    try{
      const br2 = await pool.query('SELECT schedule_id FROM bookings WHERE booking_id=$1',[id]);
      const sid2 = br2.rows[0]?.schedule_id; if (sid2){ const io = req.app.get('io'); io && io.to(`schedule_${sid2}`).emit('seats_updated'); }
    }catch{}
    // Create refund placeholder if amount > 0
    if (refund > 0){
      await pool.query('INSERT INTO refunds (booking_id, amount, status, reason) VALUES ($1,$2,$3,$4)',[id, refund, 'pending', reason]);
    }
    const updated = await pool.query('SELECT * FROM bookings WHERE booking_id=$1',[id]);
    res.json({ ok:true, booking: updated.rows[0], refund });
  }catch(e){ res.status(500).json({ error:'Failed to cancel booking', details: e.message }); }
});

module.exports = router;
