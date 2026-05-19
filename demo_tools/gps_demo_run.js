const fs = require('fs');
const path = require('path');
const { run } = require('../fleetease-backend/utils/gpsSimulator');

(async ()=>{
  try{
    const cfgPath = path.join(__dirname, 'gps_demo_config.json');
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(raw);
    await run(cfg);
    console.log('GPS demo completed');
  }catch(e){
    console.error('GPS demo failed:', e.message);
    process.exit(1);
  }
})();
