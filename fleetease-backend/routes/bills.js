const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// Helper to build CRUD for a table
function buildCrud(path, table, columns, idCol = 'bill_id'){
  // List
  router.get(`/${path}`, auth(['admin']), async (req, res) => {
    try {
      const { start, end } = req.query || {};
      const where = [];
      const args = [];
      if (start) { args.push(start); where.push(`billed_at >= $${args.length}`); }
      if (end) { args.push(end); where.push(`billed_at < ($${args.length}+ INTERVAL '1 day')`); }
      const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
      const r = await pool.query(`SELECT * FROM ${table} ${whereSql} ORDER BY ${idCol} DESC`, args);
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: 'Failed to list' }); }
  });

  // Create
  router.post(`/${path}`, auth(['admin']), async (req, res) => {
    try{
      const body = req.body || {};
      const keys = Object.keys(columns).filter(k => body[k] !== undefined);
      if (!keys.length) return res.status(400).json({ error: 'No fields provided' });
      const vals = keys.map(k => body[k]);
      const placeholders = keys.map((_,i)=> `$${i+1}`).join(',');
      const q = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const r = await pool.query(q, vals);
      res.json(r.rows[0]);
    }catch(e){ res.status(500).json({ error: 'Failed to create', details: e.message }); }
  });

  // Update
  router.put(`/${path}/:${idCol}`, auth(['admin']), async (req, res) => {
    try{
      const id = req.params[idCol];
      const body = req.body || {};
      const keys = Object.keys(columns).filter(k => body[k] !== undefined);
      if (!keys.length) return res.status(400).json({ error: 'No fields provided' });
      const sets = keys.map((k,i)=> `${k}=$${i+1}`).join(',');
      const vals = keys.map(k => body[k]);
      const q = `UPDATE ${table} SET ${sets} WHERE ${idCol}=$${keys.length+1} RETURNING *`;
      const r = await pool.query(q, [...vals, id]);
      res.json(r.rows[0] || null);
    }catch(e){ res.status(500).json({ error: 'Failed to update', details: e.message }); }
  });

  // Delete
  router.delete(`/${path}/:${idCol}`, auth(['admin']), async (req, res) => {
    try{
      const id = req.params[idCol];
      await pool.query(`DELETE FROM ${table} WHERE ${idCol}=$1`, [id]);
      res.json({ ok: true });
    }catch(e){ res.status(500).json({ error: 'Failed to delete' }); }
  });
}

buildCrud('fuel', 'fuel_bills', {
  vehicle_id: 'int', liters: 'num', price_per_liter: 'num', total: 'num', station: 'text',
  receipt_no: 'text', payment_mode: 'text', billed_at: 'ts'
});

buildCrud('toll', 'toll_bills', {
  route_id: 'int', plaza: 'text', amount: 'num', receipt_no: 'text', payment_mode: 'text', billed_at: 'ts'
});

buildCrud('permit', 'permit_bills', {
  route_id: 'int', state: 'text', amount: 'num', valid_from: 'date', valid_to: 'date', receipt_no: 'text', payment_mode: 'text', billed_at: 'ts'
});

module.exports = router;
