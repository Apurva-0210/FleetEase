const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// Public: list all routes
router.get('/', async (req, res) => {
  try{
    const r = await pool.query('SELECT route_id, source, destination, distance_km, fare_per_km FROM routes ORDER BY source, destination');
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error: 'Failed to list routes' }); }
});

// Public: list distinct cities (sources and destinations)
router.get('/cities', async (req, res) => {
  try{
    const sources = await pool.query('SELECT DISTINCT source AS city FROM routes ORDER BY city');
    const dests = await pool.query('SELECT DISTINCT destination AS city FROM routes ORDER BY city');
    res.json({ sources: sources.rows.map(x=>x.city), destinations: dests.rows.map(x=>x.city) });
  }catch(e){ res.status(500).json({ error: 'Failed to list cities' }); }
});

module.exports = router;
