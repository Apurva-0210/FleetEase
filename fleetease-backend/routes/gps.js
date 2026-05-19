const express = require('express');
const pool = require('../db');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for GPS updates (100 requests per 10 minutes per IP)
const updateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many update requests, please try again later' }
});

// Input validation for GPS update
const validateGPSUpdate = [
  body('vehicle_id').isInt().withMessage('Vehicle ID must be an integer'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('speed_kmph').optional().isFloat({ min: 0 }).withMessage('Speed must be a positive number'),
  body('fuel_level').optional().isFloat({ min: 0, max: 100 }).withMessage('Fuel level must be between 0 and 100'),
  body('heading_degrees').optional().isInt({ min: 0, max: 359 }).withMessage('Heading must be between 0 and 359'),
  body('accuracy_meters').optional().isFloat({ min: 0 }).withMessage('Accuracy must be a positive number'),
  body('status').optional().isIn(['stopped', 'moving', 'idle']).withMessage('Invalid status')
];

// Helper to ensure optional GPS columns exist on older databases
async function ensureGpsColumns(){
  try{
    await pool.query("ALTER TABLE vehicle_locations ADD COLUMN IF NOT EXISTS heading_degrees INT");
    await pool.query("ALTER TABLE vehicle_locations ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC");
    await pool.query("ALTER TABLE vehicle_locations ADD COLUMN IF NOT EXISTS status TEXT");
  }catch{
    // best-effort; ignore if table missing (will fail later in a clearer way)
  }
}

// Update GPS location for a vehicle and emit via Socket.IO
router.post('/update', updateLimiter, validateGPSUpdate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    vehicle_id, 
    latitude, 
    longitude, 
    speed_kmph = 0, 
    fuel_level = null, 
    heading_degrees = null, 
    accuracy_meters = null,
    status = 'moving'
  } = req.body;

  const client = await pool.connect();
  try {
    await ensureGpsColumns();
    await client.query('BEGIN');
    
    // Insert location update
    const result = await client.query(
      `INSERT INTO vehicle_locations 
       (vehicle_id, latitude, longitude, speed_kmph, fuel_level, heading_degrees, accuracy_meters, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [vehicle_id, latitude, longitude, speed_kmph, fuel_level, heading_degrees, accuracy_meters, status]
    );

    // Update vehicle's current location
    await client.query(
      `UPDATE vehicles 
       SET last_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           last_updated = NOW()
       WHERE vehicle_id = $3`,
      [longitude, latitude, vehicle_id]
    );

    // Get active schedule for this vehicle
    const scheduleResult = await client.query(
      `SELECT schedule_id FROM schedules 
       WHERE vehicle_id = $1 
       AND status IN ('active', 'boarding', 'on_route')
       ORDER BY departure DESC LIMIT 1`,
      [vehicle_id]
    );

    await client.query('COMMIT');

    // Emit to WebSocket
    const io = req.app.get('io');
    const locationData = {
      vehicle_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed_kmph: speed_kmph ? parseFloat(speed_kmph) : 0,
      fuel_level: fuel_level ? parseFloat(fuel_level) : null,
      heading_degrees: heading_degrees ? parseInt(heading_degrees) : null,
      accuracy_meters: accuracy_meters ? parseFloat(accuracy_meters) : null,
      status,
      ts: Date.now()
    };

    // Emit to vehicle-specific room
    io.to(`vehicle_${vehicle_id}`).emit('gps_update', locationData);
    
    // If vehicle is on an active schedule, emit to schedule room
    if (scheduleResult.rows.length > 0) {
      const scheduleId = scheduleResult.rows[0].schedule_id;
      io.to(`schedule_${scheduleId}`).emit('location_update', locationData);
    }

    res.json({ 
      ok: true, 
      location: { latitude, longitude },
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('GPS update error:', error);
    res.status(500).json({ 
      error: 'Failed to update GPS', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    client.release();
  }
});

// Get last known location for a vehicle
router.get('/last/:vehicle_id', [
  param('vehicle_id').isInt().withMessage('Vehicle ID must be an integer')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await pool.query(
      `SELECT 
         location_id, 
         vehicle_id, 
         latitude, 
         longitude, 
         speed_kmph,
         fuel_level,
         heading_degrees,
         accuracy_meters,
         status,
         updated_at
       FROM vehicle_locations 
       WHERE vehicle_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [req.params.vehicle_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No location data found for this vehicle' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching last location:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GPS data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get location history for a vehicle
router.get('/history/:vehicle_id', [
  param('vehicle_id').isInt().withMessage('Vehicle ID must be an integer'),
  query('start_time').optional().isISO8601().withMessage('Invalid start time format'),
  query('end_time').optional().isISO8601().withMessage('Invalid end time format'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { start_time, end_time } = req.query;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    let query = `
      SELECT 
        location_id, 
        vehicle_id, 
        latitude, 
        longitude, 
        speed_kmph,
        fuel_level,
        heading_degrees,
        accuracy_meters,
        status,
        updated_at
      FROM vehicle_locations 
      WHERE vehicle_id = $1
    `;
    
    const queryParams = [req.params.vehicle_id];
    let paramIndex = 2;

    if (start_time) {
      query += ` AND updated_at >= $${paramIndex++}`;
      queryParams.push(new Date(start_time));
    }
    
    if (end_time) {
      query += ` AND updated_at <= $${paramIndex++}`;
      queryParams.push(new Date(end_time));
    }

    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch location history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get active vehicles with recent locations
router.get('/active', async (req, res) => {
  try {
    // Only select columns that are guaranteed to exist in vehicle_locations
    const result = await pool.query(`
      SELECT DISTINCT ON (v.vehicle_id)
        v.vehicle_id,
        v.vehicle_number,
        v.type,
        v.capacity,
        vl.latitude,
        vl.longitude,
        vl.speed_kmph,
        vl.updated_at,
        s.schedule_id,
        s.departure,
        s.arrival,
        s.status as schedule_status,
        r.source,
        r.destination
      FROM vehicles v
      JOIN vehicle_locations vl ON v.vehicle_id = vl.vehicle_id
      LEFT JOIN schedules s ON s.vehicle_id = v.vehicle_id 
        AND s.status IN ('active', 'boarding', 'on_route')
      LEFT JOIN routes r ON s.route_id = r.route_id
      WHERE vl.updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY v.vehicle_id, vl.updated_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active vehicles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active vehicles',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
