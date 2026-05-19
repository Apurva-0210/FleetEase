const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// List upcoming assignments (schedules) for the logged-in driver
router.get('/assignments', auth(['driver']), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const q = `
      SELECT s.*, r.source, r.destination, v.vehicle_number
      FROM schedules s
      JOIN vehicles v ON v.vehicle_id = s.vehicle_id
      JOIN routes r ON r.route_id = s.route_id
      WHERE v.assigned_driver_id = $1
        AND s.departure >= NOW() - INTERVAL '12 hours'
      ORDER BY s.departure ASC
      LIMIT 50`;
    const r1 = await pool.query(q, [userId]);
    res.json(r1.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Fetch the vehicle assigned to the logged-in driver
router.get('/vehicle', auth(['driver']), async (req, res) => {
  try{
    const userId = req.user.user_id;
    const r = await pool.query(
      `SELECT v.* FROM vehicles v WHERE v.assigned_driver_id = $1 LIMIT 1`,
      [userId]
    );
    res.json(r.rows[0] || null);
  }catch(e){ res.status(500).json({ error:'Failed to fetch assigned vehicle' }); }
});

// Seats booked for a given assignment (schedule)
router.get('/assignments/:schedule_id/seats', auth(['driver']), async (req, res) => {
  try {
    const sid = req.params.schedule_id;
    const s = await pool.query('SELECT vehicle_id, route_id, departure FROM schedules WHERE schedule_id=$1', [sid]);
    if (!s.rows.length) return res.status(404).json({ error: 'Schedule not found' });
    const { vehicle_id, route_id, departure } = s.rows[0];

    // Find bookings for this vehicle on the same calendar day as schedule departure
    const bookings = await pool.query(
      `SELECT b.*
       FROM bookings b
       WHERE b.vehicle_id=$1
         AND DATE(b.booking_time) = DATE($2)
         AND b.status IN ('pending','confirmed','completed')
       ORDER BY b.booking_time ASC`,
      [vehicle_id, departure]
    );
    const bookingIds = bookings.rows.map(b => b.booking_id);
    if (!bookingIds.length) return res.json([]);

    const inParams = bookingIds.map((_, i) => `$${i + 1}`).join(',');
    const seats = await pool.query(
      `SELECT bs.*, b.pickup_location, b.drop_location
       FROM booking_seats bs
       JOIN bookings b ON b.booking_id = bs.booking_id
       WHERE bs.booking_id IN (${inParams})
       ORDER BY bs.id`,
      bookingIds
    );
    res.json(seats.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

module.exports = router;
