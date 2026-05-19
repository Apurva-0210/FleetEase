const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

async function ensureTables(){
  await pool.query(`CREATE TABLE IF NOT EXISTS toll_transactions (
    id SERIAL PRIMARY KEY,
    issuer TEXT,
    tag_id TEXT,
    vehicle_id INT,
    vehicle_number TEXT,
    plaza_id TEXT,
    plaza_name TEXT,
    txn_time TIMESTAMP,
    amount NUMERIC,
    txn_id TEXT UNIQUE,
    status TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Webhook to receive FASTag transactions from issuer/aggregator
router.post('/webhook/:issuer', async (req, res)=>{
  try{
    const token = req.headers['x-fastag-token'] || req.query.token || '';
    const expected = process.env.FASTAG_WEBHOOK_TOKEN || '';
    if (expected && token !== expected) return res.status(401).json({ error:'invalid signature' });
    await ensureTables();
    const issuer = String(req.params.issuer||'').toLowerCase();
    const body = req.body || {};
    // Try to normalize from common fields
    const txnId = body.txn_id || body.txnId || body.transactionId || body.txnReference || null;
    const tagId = body.tag_id || body.tagId || body.tagNo || null;
    const vehicleNumber = body.vehicle_number || body.vehicleNo || body.vrn || null;
    const plazaId = body.plaza_id || body.plazaId || null;
    const plazaName = body.plaza_name || body.plazaName || null;
    const amount = Number(body.amount || body.debitAmount || 0) || 0;
    const when = body.txn_time || body.txnTime || body.transactionTime || body.txnDate || null;
    const status = body.status || body.txnStatus || 'success';

    // Best-effort map vehicle_id by vehicle_number
    let vehicleId = null;
    if (vehicleNumber){
      const vr = await pool.query('SELECT vehicle_id FROM vehicles WHERE vehicle_number=$1 LIMIT 1',[vehicleNumber]);
      vehicleId = vr.rows[0]?.vehicle_id || null;
    }

    if (!txnId){
      // Idempotency requires a key; fallback to hash of payload
      const crypto = require('crypto');
      const h = crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex');
      // Not unique-safe but better than nothing
      try{
        await pool.query('INSERT INTO toll_transactions (issuer, tag_id, vehicle_id, vehicle_number, plaza_id, plaza_name, txn_time, amount, txn_id, status, raw_payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (txn_id) DO NOTHING',[
          issuer, tagId, vehicleId, vehicleNumber, plazaId, plazaName, when? new Date(when) : new Date(), amount, h, status, body
        ]);
      }catch(e){}
      return res.json({ ok:true });
    }

    await pool.query(
      `INSERT INTO toll_transactions (issuer, tag_id, vehicle_id, vehicle_number, plaza_id, plaza_name, txn_time, amount, txn_id, status, raw_payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (txn_id) DO UPDATE SET issuer=EXCLUDED.issuer, tag_id=EXCLUDED.tag_id, vehicle_id=COALESCE(EXCLUDED.vehicle_id, toll_transactions.vehicle_id), vehicle_number=COALESCE(EXCLUDED.vehicle_number, toll_transactions.vehicle_number), plaza_id=EXCLUDED.plaza_id, plaza_name=EXCLUDED.plaza_name, txn_time=EXCLUDED.txn_time, amount=EXCLUDED.amount, status=EXCLUDED.status, raw_payload=EXCLUDED.raw_payload`,
      [issuer, tagId, vehicleId, vehicleNumber, plazaId, plazaName, when? new Date(when) : new Date(), amount, txnId, status, body]
    );
    res.json({ ok:true });
  }catch(e){
    console.error('FASTag webhook error', e);
    res.status(500).json({ error:'failed' });
  }
});

// Admin list/report API
router.get('/tolls', auth(['admin']), async (req, res)=>{
  try{
    await ensureTables();
    const { vehicle_id, from, to } = req.query || {};
    const params = [];
    let where = '1=1';
    if (vehicle_id){ params.push(Number(vehicle_id)); where += ` AND vehicle_id = $${params.length}`; }
    if (from){ params.push(from); where += ` AND txn_time >= $${params.length}`; }
    if (to){ params.push(to); where += ` AND txn_time <= $${params.length}`; }
    const q = `SELECT * FROM toll_transactions WHERE ${where} ORDER BY txn_time DESC NULLS LAST, id DESC LIMIT 1000`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error:'Failed to list tolls' }); }
});

module.exports = router;
