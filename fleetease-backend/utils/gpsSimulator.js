const axios = require('axios');
const route = [
  { lat: 25.5941, lon: 85.1376 }, // Patna
  { lat: 25.66, lon: 85.5 },
  { lat: 25.8, lon: 86.2 },
  { lat: 25.9, lon: 86.6 },
  { lat: 25.78, lon: 87.47 } // Purnea
];

async function run({ baseUrl = 'http://localhost:5000', vehicle_id = 1, intervalMs = 5000 }) {
  for (const p of route) {
    try {
      await axios.post(baseUrl + '/api/gps/update', {
        vehicle_id,
        latitude: p.lat,
        longitude: p.lon,
        speed_kmph: 45 + Math.random()*10,
        fuel_level: 50 + Math.random()*10
      });
      console.log('Sent point', p);
    } catch (e) {
      console.error('Send failed', e.message);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

if (require.main === module) {
  run({}).catch(console.error);
}

module.exports = { run };
