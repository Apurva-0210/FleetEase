const { Pool } = require('pg');
require('dotenv').config();

function createPool() {
  if (process.env.DATABASE_URL) {
    const useSsl =
      process.env.DB_SSL === 'true' ||
      /render\.com|amazonaws\.com|supabase/i.test(process.env.DATABASE_URL);

    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
  }

  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: Number(process.env.DB_PORT || 5432),
  });
}

const pool = createPool();

module.exports = pool;
