const pool = require('../db');
module.exports = async (req, res) => {
  try{
    const r = await pool.query(`SELECT id, agent_user_id, customer_name, customer_phone, route_id, schedule_id, seats, amount, payment_method, created_at FROM offline_bookings ORDER BY id DESC LIMIT 500`);
    res.json(r.rows);
  }catch(e){ res.status(500).json({ error: 'Failed to load offline bookings', details: e.message }); }
};
