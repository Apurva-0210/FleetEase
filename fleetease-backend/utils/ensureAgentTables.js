const pool = require('../db');

async function ensureAgentTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS agents (
    agent_user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    agent_code TEXT UNIQUE,
    commission_rate NUMERIC DEFAULT 0.05,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS offline_bookings (
    id SERIAL PRIMARY KEY,
    agent_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    route_id INT,
    schedule_id INT,
    seats TEXT,
    amount NUMERIC,
    payment_method VARCHAR(10) DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`ALTER TABLE offline_bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) DEFAULT 'cash'`);
}

module.exports = { ensureAgentTables };
