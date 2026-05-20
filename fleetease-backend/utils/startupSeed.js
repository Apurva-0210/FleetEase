const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { DEFAULT_GALLERY_FILES } = require('./galleryDefaults');

const GALLERY_FILE = path.join(__dirname, '..', 'data', 'gallery.json');

async function seedTestimonials() {
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

  const reviews = [
    ['Ravi Kumar', 5, 'Very comfortable journey from Patna to Purnea. Driver was polite and on time.', 5, 5, 5, 5, 5],
    ['Priya Sharma', 4, 'Clean bus and smooth ride. Booking online was easy.', 4, 5, 4, 4, 4],
    ['Amit Singh', 5, 'Best fleet service in Bihar. Will book again.', 5, 4, 5, 5, 5],
  ];

  for (const row of reviews) {
    const exists = await pool.query('SELECT 1 FROM testimonials WHERE name=$1', [row[0]]);
    if (!exists.rows.length) {
      await pool.query(
        `INSERT INTO testimonials (name, rating, comment, bus_condition, cleanliness, driver_behaviour, punctuality, comfort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        row
      );
    }
  }
}

async function seedGalleryManifest() {
  const dataDir = path.dirname(GALLERY_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let files = [];
  if (fs.existsSync(GALLERY_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
      files = Array.isArray(raw?.files) ? raw.files : [];
    } catch {
      files = [];
    }
  }

  const names = new Set(files.map((f) => f.name));
  let added = 0;
  for (const asset of DEFAULT_GALLERY_FILES) {
    if (!names.has(asset.name)) {
      files.push({ ...asset });
      added += 1;
    }
  }

  if (!files.length || added > 0) {
    fs.writeFileSync(GALLERY_FILE, JSON.stringify({ files }, null, 2), 'utf8');
  }
}

async function runStartupSeed() {
  await seedTestimonials();
  await seedGalleryManifest();
}

module.exports = { runStartupSeed };
