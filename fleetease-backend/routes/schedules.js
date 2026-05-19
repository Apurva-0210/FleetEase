const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// GET /api/schedules?source&destination&date(YYYY-MM-DD)
router.get('/', async (req, res) => {
  try {
    const { source, destination, date } = req.query;
    const params = [];
    let where = '1=1';
    if (source) { params.push(source); where += ` AND LOWER(rt.source) LIKE LOWER('%' || $${params.length} || '%')`; }
    if (destination) { params.push(destination); where += ` AND LOWER(rt.destination) LIKE LOWER('%' || $${params.length} || '%')`; }
    if (date) { params.push(date); where += ` AND DATE(sc.departure) = $${params.length}`; }
    const q = `
      SELECT sc.*, rt.source, rt.destination, rt.distance_km, rt.fare_per_km, v.vehicle_number, v.type AS vehicle_type
      FROM schedules sc
      JOIN routes rt ON rt.route_id = sc.route_id
      LEFT JOIN vehicles v ON v.vehicle_id = sc.vehicle_id
      WHERE ${where}
      ORDER BY sc.departure ASC`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Failed to list schedules', details: e.message }); }
});

// GET one schedule by id with route info
router.get('/:id', async (req, res) => {
  try{
    const q = `SELECT sc.*, rt.source, rt.destination, rt.distance_km, rt.fare_per_km, v.vehicle_number, v.type AS vehicle_type
               FROM schedules sc
               JOIN routes rt ON rt.route_id = sc.route_id
               LEFT JOIN vehicles v ON v.vehicle_id = sc.vehicle_id
               WHERE sc.schedule_id=$1`;
    const r = await pool.query(q, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
  }catch(e){ res.status(500).json({ error:'Failed to fetch schedule', details: e.message }); }
});

// POST /api/schedules (admin only) - publish a schedule
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { route_id, vehicle_id, bus_number, bus_type, departure, arrival, status } = req.body;
    const q = `INSERT INTO schedules (route_id,vehicle_id,bus_number,bus_type,departure,arrival,status)
               VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const r = await pool.query(q, [route_id, vehicle_id || null, bus_number, bus_type, departure, arrival || null, status || 'active']);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Failed to create schedule', details: e.message }); }
});

module.exports = router;
// Update schedule (admin only)
router.put('/:id', auth(['admin']), async (req, res) => {
  try{
    const id = req.params.id;
    const { route_id, vehicle_id, bus_number, bus_type, departure, arrival, status } = req.body || {};
    const fields = [];
    const values = [];
    if (route_id !== undefined) { fields.push('route_id'); values.push(route_id); }
    if (vehicle_id !== undefined) { fields.push('vehicle_id'); values.push(vehicle_id); }
    if (bus_number !== undefined) { fields.push('bus_number'); values.push(bus_number); }
    if (bus_type !== undefined) { fields.push('bus_type'); values.push(bus_type); }
    if (departure !== undefined) { fields.push('departure'); values.push(departure); }
    if (arrival !== undefined) { fields.push('arrival'); values.push(arrival); }
    if (status !== undefined) { fields.push('status'); values.push(status); }
    if (!fields.length) return res.status(400).json({ error: 'No fields' });
    const setSql = fields.map((f,i)=> `${f}=$${i+1}`).join(',');
    const q = `UPDATE schedules SET ${setSql} WHERE schedule_id=$${fields.length+1} RETURNING *`;
    const r = await pool.query(q, [...values, id]);
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error: 'Failed to update schedule', details: e.message }); }
});

// Delete schedule (admin only)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try{
    await pool.query('DELETE FROM schedules WHERE schedule_id=$1', [req.params.id]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ error: 'Failed to delete schedule' }); }
});

// Cancel an entire schedule: mark schedule cancelled and refund all bookings 100%
router.post('/:id/cancel', auth(['admin']), async (req, res) => {
  const client = await pool.connect();
  try{
    const sid = req.params.id;
    await client.query('BEGIN');
    // Mark schedule cancelled
    await client.query("UPDATE schedules SET status='cancelled' WHERE schedule_id=$1", [sid]);

    // Ensure refund infra exists
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT");
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP");
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT");
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_user INT");
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT");
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC");
    await client.query(`CREATE TABLE IF NOT EXISTS refunds (
      id SERIAL PRIMARY KEY,
      booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Online bookings: full refund, no Rs25 fee
    const bok = await client.query("SELECT booking_id, fare FROM bookings WHERE schedule_id=$1 AND (status IS DISTINCT FROM 'cancelled')", [sid]);
    for (const b of bok.rows){
      const refund = Number(b.fare || 0);
      await client.query(
        "UPDATE bookings SET status='cancelled', cancelled_at=NOW(), cancelled_by_role=$1, cancelled_by_user=$2, cancel_reason=$3, refund_amount=$4 WHERE booking_id=$5",
        ['admin', req.user.user_id, 'Schedule cancelled by operator', refund, b.booking_id]
      );
      await client.query('DELETE FROM booking_seats WHERE booking_id=$1', [b.booking_id]);
      if (refund > 0){
        await client.query('INSERT INTO refunds (booking_id, amount, status, reason) VALUES ($1,$2,$3,$4)', [b.booking_id, refund, 'pending', 'Schedule cancelled']);
      }
    }

    // Offline bookings: mark cancelled and set refund_amount to full amount
    await client.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS status TEXT`);
    await client.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`);
    await client.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC`);
    const off = await client.query('SELECT id, amount FROM offline_bookings WHERE schedule_id=$1 AND (status IS DISTINCT FROM $2 OR status IS NULL)', [sid, 'cancelled']);
    for (const o of off.rows){
      const refund = Number(o.amount || 0);
      await client.query("UPDATE offline_bookings SET status='cancelled', cancelled_at=NOW(), refund_amount=$1 WHERE id=$2", [refund, o.id]);
    }

    await client.query('COMMIT');
    res.json({ ok:true, cancelled_bookings: bok.rows.length, cancelled_offline: off.rows.length });
  }catch(e){
    await client.query('ROLLBACK');
    res.status(500).json({ error:'Failed to cancel schedule', details: e.message });
  }finally{ client.release(); }
});
