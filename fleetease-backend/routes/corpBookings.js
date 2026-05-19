const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS corp_bookings (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      trip_type TEXT NOT NULL,
      bus_type TEXT NOT NULL,
      passengers_count INT NOT NULL,
      start_date DATE,
      end_date DATE,
      travel_days INT NOT NULL,
      total_km NUMERIC(10,1) NOT NULL,
      estimated_total NUMERIC(12,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function calculateQuote({ itinerary, trip_type, bus_type, travel_days }) {
  const total_km = (itinerary || []).reduce(
    (sum, leg) => sum + Number(leg.distance_km || 0),
    0
  );

  // Different pricing per bus type
  let basePerDay;
  let perKm;
  let driverPerDay;
  let permitPerDay;

  switch (bus_type) {
    case '2x1_sleeper':
      basePerDay = 4500;
      perKm = 40;
      driverPerDay = 700;
      permitPerDay = 400;
      break;
    case 'luxury':
      basePerDay = 6000;
      perKm = 50;
      driverPerDay = 900;
      permitPerDay = 600;
      break;
    case 'mini':
      basePerDay = 2500;
      perKm = 25;
      driverPerDay = 400;
      permitPerDay = 250;
      break;
    case '2x2':
    default:
      basePerDay = 3000;
      perKm = 30;
      driverPerDay = 500;
      permitPerDay = 300;
      break;
  }
  const days = Math.max(1, Number(travel_days || 1));

  let subtotal =
    basePerDay * days +
    perKm * total_km +
    driverPerDay * days +
    permitPerDay * days;

  let returnDiscountPct = 0;
  if (trip_type === 'return') {
    returnDiscountPct = 10;
    subtotal = subtotal * (1 - returnDiscountPct / 100);
  }

  const taxes = Math.round(subtotal * 0.05);
  const total = Math.round(subtotal + taxes);

  return {
    total_km: Number(total_km.toFixed(1)),
    total,
    breakdown: {
      base_per_day: basePerDay,
      per_km: perKm,
      driver_allowance_per_day: driverPerDay,
      permit_per_day: permitPerDay,
      return_discount_pct: returnDiscountPct || null,
      subtotal: Math.round(subtotal),
      taxes,
    },
  };
}

router.post('/quote', auth(['company_admin']), async (req, res) => {
  try {
    const { itinerary = [], trip_type, bus_type, travel_days } = req.body;
    const quote = calculateQuote({ itinerary, trip_type, bus_type, travel_days });
    res.json(quote);
  } catch (e) {
    console.error('corp-bookings quote error', e);
    res.status(500).json({ error: 'Failed to calculate quote' });
  }
});

router.post('/', auth(['company_admin']), async (req, res) => {
  try {
    await ensureTable();
    const {
      itinerary = [],
      trip_type,
      bus_type,
      passengers_count,
      start_date,
      end_date,
      travel_days,
    } = req.body;

    const quote = calculateQuote({ itinerary, trip_type, bus_type, travel_days });

    const r = await pool.query(
      `INSERT INTO corp_bookings
       (user_id, trip_type, bus_type, passengers_count,
        start_date, end_date, travel_days, total_km, estimated_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.user.user_id,
        trip_type,
        bus_type,
        passengers_count || 0,
        start_date || null,
        end_date || null,
        travel_days || 1,
        quote.total_km,
        quote.total,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error('corp-bookings create error', e);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

router.get('/mine', auth(['company_admin']), async (req, res) => {
  try {
    await ensureTable();
    const r = await pool.query(
      `SELECT id, trip_type, bus_type, start_date, end_date,
              travel_days, estimated_total, status, created_at
       FROM corp_bookings
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    res.json(r.rows);
  } catch (e) {
    console.error('corp-bookings mine error', e);
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

module.exports = router;
