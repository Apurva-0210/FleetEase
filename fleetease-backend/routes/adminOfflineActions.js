const pool = require('../db');
module.exports.cancelOffline = async (req, res) => {
  try{
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error:'Invalid id' });
    // Ensure columns
    await pool.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS status TEXT`);
    await pool.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`);
    await pool.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC`);
    await pool.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT`);

    const r = await pool.query('SELECT * FROM offline_bookings WHERE id=$1', [id]);
    if (!r.rows.length) return res.status(404).json({ error:'Not found' });
    const ob = r.rows[0];
    if (ob.status === 'cancelled') return res.json({ ok:true, booking: ob });

    // Compute refund similar to online (Rs 25 fee)
    let pct = 0;
    if (ob.schedule_id){
      const sch = await pool.query('SELECT departure FROM schedules WHERE schedule_id=$1',[ob.schedule_id]);
      const dep = sch.rows[0]?.departure ? new Date(sch.rows[0].departure) : null;
      if (dep){
        const hours = (dep.getTime() - Date.now()) / (1000*60*60);
        if (hours > 24) pct = 1.0; else if (hours >= 12) pct = 0.5; else pct = 0.0;
      }
    }
    const base = Number(ob.amount || 0);
    let refund = Math.max(0, Math.round((base * pct - 25) * 100) / 100);
    if (pct === 0) refund = 0;

    const reason = String(req.body?.reason || 'Admin/Agent requested');
    await pool.query("UPDATE offline_bookings SET status='cancelled', cancelled_at=NOW(), refund_amount=$1, cancel_reason=$2 WHERE id=$3", [refund, reason, id]);
    res.json({ ok:true, refund });
  }catch(e){ res.status(500).json({ error:'Failed to cancel offline booking', details: e.message }); }
};
