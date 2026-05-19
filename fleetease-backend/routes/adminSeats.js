const pool = require('../db');
module.exports = async (req, res) => {
  try{
    const sid = Number(req.params.schedule_id);
    if (!Number.isFinite(sid)) return res.status(400).json({ error:'Invalid schedule_id' });
    const set = new Set();
    // Discover column existence to avoid 500s
    const cols = (await pool.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_name IN ('booking_seats','bookings') AND column_name='schedule_id'
    `)).rows.reduce((acc, r)=>{ acc[`${r.table_name}.${r.column_name}`]=true; return acc; }, {});
    // Online seats (direct schedule_id on booking_seats)
    if (cols['booking_seats.schedule_id']){
      const q1 = await pool.query('SELECT seat_label FROM booking_seats WHERE schedule_id=$1',[sid]);
      for (const r of q1.rows){ if (r.seat_label) set.add(String(r.seat_label).trim().toUpperCase()); }
    }
    // Online seats (bookings.schedule_id -> booking_seats)
    if (cols['bookings.schedule_id']){
      const q2 = await pool.query('SELECT bs.seat_label FROM booking_seats bs JOIN bookings b ON b.booking_id=bs.booking_id WHERE b.schedule_id=$1',[sid]);
      for (const r of q2.rows){ if (r.seat_label) set.add(String(r.seat_label).trim().toUpperCase()); }
    }
    // Offline seats from offline_bookings
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
      String(row.seats||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(s=> set.add(s.toUpperCase()))
    }
    // Also try to read seats from bookings.* CSV columns if present
    const colsQ = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='bookings' AND column_name IN ('seats','seat_labels','selected_seats','seat_numbers')
    `);
    const cols2 = colsQ.rows.map(r=> r.column_name);
    if (cols2.length){
      const selectCols = cols2.map(c=> `COALESCE(${c}, '') AS ${c}`).join(',');
      let bq;
      if (cols['bookings.schedule_id']) bq = await pool.query(`SELECT ${selectCols} FROM bookings WHERE schedule_id=$1`, [sid]);
      else bq = await pool.query(`SELECT ${selectCols} FROM bookings WHERE 1=0`); // empty when no schedule_id
      for (const row of bq.rows){
        for (const c of cols2){
          const raw = row[c];
          if (!raw) continue;
          String(raw).split(',').map(s=>s.trim()).filter(Boolean).forEach(s=> set.add(s.toUpperCase()));
        }
      }
    }
    console.log(`Loaded ${set.size} seats for schedule ${sid}`);
    // Additional aggregation: by schedule's route_id and travel date (covers flows without schedule_id/vehicle_id linkage)
    const sch = await pool.query('SELECT route_id, vehicle_id, departure FROM schedules WHERE schedule_id=$1',[sid]);
    if (sch.rows[0]){
      const { route_id, vehicle_id, departure } = sch.rows[0];
      if (departure){
        // by route + date
        const bksByRoute = await pool.query(
          `SELECT b.booking_id FROM bookings b
           WHERE ($1::INT IS NULL OR b.route_id=$1)
             AND DATE(b.booking_time)=DATE($2)
             AND (b.status IS NULL OR b.status IN ('pending','confirmed','completed'))`,
          [route_id||null, departure]
        );
        if (bksByRoute.rows.length){
          const ids = bksByRoute.rows.map(x=> x.booking_id);
          const ph = ids.map((_,i)=> `$${i+1}`).join(',');
          const seatRows = await pool.query(`SELECT bs.seat_label FROM booking_seats bs WHERE bs.booking_id IN (${ph})`, ids);
          for (const r of seatRows.rows){ if (r.seat_label) set.add(String(r.seat_label).trim().toUpperCase()); }
          // CSV seat columns
          const colsQ2 = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name='bookings' AND column_name IN ('seats','seat_labels','selected_seats','seat_numbers')
          `);
          const csvCols = colsQ2.rows.map(r=> r.column_name);
          if (csvCols.length){
            const sel = csvCols.map(c=> `COALESCE(${c}, '') AS ${c}`).join(',');
            const bq2 = await pool.query(`SELECT ${sel} FROM bookings WHERE booking_id IN (${ph})`, ids);
            for (const row of bq2.rows){
              for (const c of csvCols){
                const raw = row[c]; if (!raw) continue;
                String(raw).split(',').map(s=>s.trim()).filter(Boolean).forEach(s=> set.add(s.toUpperCase()));
              }
            }
          }
        }
        // Also include by vehicle_id + date (if present)
        if (vehicle_id){
          const bks = await pool.query(
            `SELECT b.booking_id FROM bookings b
             WHERE b.vehicle_id=$1 AND DATE(b.booking_time) = DATE($2)
               AND (b.status IS NULL OR b.status IN ('pending','confirmed','completed'))`,
            [vehicle_id, departure]
          );
          if (bks.rows.length){
            const ids = bks.rows.map(x=> x.booking_id);
            const placeholders = ids.map((_,i)=> `$${i+1}`).join(',');
            const seatRows = await pool.query(
              `SELECT bs.seat_label FROM booking_seats bs WHERE bs.booking_id IN (${placeholders})`,
              ids
            );
            for (const r of seatRows.rows){ if (r.seat_label) set.add(String(r.seat_label).trim().toUpperCase()); }
          }
        }
      }
    }
    // Normalize seat labels to SeatMap format
    const final = new Set();
    for (const raw of set){
      let lab = String(raw).trim().toUpperCase();
      // strip common prefixes and non-alphanumerics
      lab = lab.replace(/^SEAT[-_\s]*/,'').replace(/[^A-Z0-9]/g,'');
      final.add(lab);
      // number-first (1A) -> add L1A and U1A
      if (/^[0-9]+[A-Z]$/.test(lab)) { final.add('L'+lab); final.add('U'+lab); }
      // letter-first (A1) -> add L1A and U1A
      const m = lab.match(/^([A-Z])([0-9]+)$/);
      if (m) { final.add('L'+m[2]+m[1]); final.add('U'+m[2]+m[1]); }
    }
    res.json(Array.from(final));
  }catch(e){ res.status(500).json({ error:'Failed to load seats', details: e.message }); }
};
