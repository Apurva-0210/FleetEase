require('dotenv').config();
const pool = require('../db');

const reviews = [
  ['Ravi Kumar', 5, 'Very comfortable journey from Patna to Purnea. Driver was polite and bus was on time.', 5, 5, 5, 5, 5],
  ['Priya Sharma', 4, 'Clean bus and smooth ride. Booking online was easy.', 4, 5, 4, 4, 4],
  ['Amit Singh', 5, 'Best fleet service in Bihar. Will book again.', 5, 4, 5, 5, 5],
];

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS testimonials (
    id SERIAL PRIMARY KEY,
    name TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    bus_condition INT,
    cleanliness INT,
    driver_behaviour INT,
    punctuality INT,
    comfort INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  let added = 0;
  for (const row of reviews) {
    const exists = await pool.query('SELECT 1 FROM testimonials WHERE name=$1', [row[0]]);
    if (!exists.rows.length) {
      await pool.query(
        `INSERT INTO testimonials (name, rating, comment, bus_condition, cleanliness, driver_behaviour, punctuality, comfort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        row
      );
      added += 1;
    }
  }
  const count = await pool.query('SELECT COUNT(*)::int AS c FROM testimonials');
  console.log(`Added ${added} reviews. Total testimonials: ${count.rows[0].c}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
