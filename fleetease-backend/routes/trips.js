const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { source, destination } = req.query;
    if (source || destination) {
      const r = await pool.query(
        `SELECT * FROM routes
         WHERE ($1::text IS NULL OR LOWER(source) LIKE LOWER('%' || $1 || '%'))
           AND ($2::text IS NULL OR LOWER(destination) LIKE LOWER('%' || $2 || '%'))
         ORDER BY route_id`,
        [source || null, destination || null]
      );
      return res.json(r.rows);
    }
    const r = await pool.query('SELECT * FROM routes ORDER BY route_id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Failed to list routes', details: e.message }); }
});

// Distinct route sources and destinations for dropdowns
router.get('/cities', async (req, res) => {
  try {
    const r = await pool.query('SELECT DISTINCT source, destination FROM routes');
    const sourcesSet = new Set();
    const destSet = new Set();
    for (const row of r.rows) {
      if (row.source) sourcesSet.add(row.source);
      if (row.destination) destSet.add(row.destination);
    }
    const sources = Array.from(sourcesSet).sort();
    const destinations = Array.from(destSet).sort();
    res.json({ sources, destinations });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list cities', details: e.message });
  }
});

// Get stops for a given route
router.get('/:id/stops', async (req, res) => {
  try{
    const rid = req.params.id;
    const r = await pool.query('SELECT * FROM route_stops WHERE route_id=$1 ORDER BY sequence', [rid]);
    res.json(r.rows);
  }catch(e){
    res.status(500).json({ error: 'Failed to fetch stops', details: e.message });
  }
});

module.exports = router;
