const pool = require('../db');
module.exports = async (req, res) => {
  try{
    const sid = Number(req.params.schedule_id);
    if (!Number.isFinite(sid)) return res.status(400).json({ error:'Invalid schedule_id' });
    // Online seats from booking_seats via schedule_id or join with bookings
    const onlineQ = await pool.query(`
      SELECT seat_label FROM booking_seats WHERE schedule_id = $1
      UNION ALL
      SELECT bs.seat_label FROM booking_seats bs JOIN bookings b ON b.booking_id = bs.booking_id WHERE b.schedule_id = $1
    `,[sid]);
    const set = new Set();
    for (const r of onlineQ.rows){ if (r.seat_label) set.add(String(r.seat_label).trim().toUpperCase()); }
    // Also attempt CSV columns in bookings
    const colsQ = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='bookings' AND column_name IN ('seats','seat_labels','selected_seats','seat_numbers')
    `);
    const cols = colsQ.rows.map(r=> r.column_name);
    if (cols.length){
      const selectCols = cols.map(c=> `COALESCE(${c}, '') AS ${c}`).join(',');
      const bq = await pool.query(`SELECT ${selectCols} FROM bookings WHERE schedule_id=$1`, [sid]);
      for (const row of bq.rows){
        for (const c of cols){
          const raw = row[c]; if (!raw) continue;
          String(raw).split(',').map(s=>s.trim()).filter(Boolean).forEach(s=> set.add(s.toUpperCase()));
        }
      }
    }
    // Offline seats
    await pool.query(`CREATE TABLE IF NOT EXISTS offline_bookings (
      id SERIAL PRIMARY KEY,
      agent_user_id INT,
      customer_name TEXT,
      customer_phone TEXT,
      route_id INT,
      schedule_id INT,
      seats TEXT,
      amount NUMERIC,
      payment_method VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const offQ = await pool.query('SELECT seats FROM offline_bookings WHERE schedule_id=$1',[sid]);
    for (const row of offQ.rows){
      String(row.seats||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(s=> set.add(s.toUpperCase()));
    }
    res.json(Array.from(set));
  }catch(e){ res.status(500).json({ error:'Failed to load seats', details: e.message }); }
};
