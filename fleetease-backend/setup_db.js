const pool = require('./db');
const bcrypt = require('bcrypt');
const { listFixedRoutes } = require('./utils/routeFares');
const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1);
async function setup() {
  try {
    console.log('🚀 Starting database setup...');

    // ---------------------- CREATE TABLES ----------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) CHECK (role IN ('admin','customer','driver','company_admin','agent')),
        password_hash TEXT NOT NULL,
        points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id SERIAL PRIMARY KEY,
        vehicle_number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50),
        capacity INT,
        status VARCHAR(20) DEFAULT 'available',
        assigned_driver_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure assigned_driver_id references users (drivers)
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_name='vehicles' AND column_name='assigned_driver_id'
        ) THEN
          ALTER TABLE vehicles ADD COLUMN assigned_driver_id INT;
        END IF;
        -- Add FK if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name='vehicles' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='assigned_driver_id'
        ) THEN
          ALTER TABLE vehicles
            ADD CONSTRAINT vehicles_assigned_driver_fk
            FOREIGN KEY (assigned_driver_id) REFERENCES users(user_id) ON DELETE SET NULL;
        END IF;
      EXCEPTION WHEN others THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS drivers (
        driver_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        license_no VARCHAR(50) UNIQUE,
        status VARCHAR(20) DEFAULT 'active',
        joined_date DATE DEFAULT CURRENT_DATE
      );

      CREATE TABLE IF NOT EXISTS routes (
        route_id SERIAL PRIMARY KEY,
        source VARCHAR(150) NOT NULL,
        destination VARCHAR(150) NOT NULL,
        distance_km DECIMAL(10,2) NOT NULL,
        fare_per_km DECIMAL(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        booking_id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES users(user_id),
        driver_id INT REFERENCES drivers(driver_id),
        vehicle_id INT REFERENCES vehicles(vehicle_id),
        route_id INT REFERENCES routes(route_id),
        pickup_location TEXT,
        drop_location TEXT,
        booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(30) DEFAULT 'pending',
        payment_status VARCHAR(30) DEFAULT 'unpaid',
        fare DECIMAL(10,2),
        booking_type VARCHAR(10) DEFAULT 'B2C',
        company_name VARCHAR(255),
        company_contact VARCHAR(100),
        approval_status VARCHAR(20) DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS payments (
        payment_id SERIAL PRIMARY KEY,
        booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
        amount DECIMAL(10,2),
        method VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pending',
        transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoices (
        invoice_id SERIAL PRIMARY KEY,
        booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        total_amount DECIMAL(12,2),
        issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_due DATE,
        payment_status VARCHAR(20) DEFAULT 'unpaid'
      );

      CREATE TABLE IF NOT EXISTS vehicle_locations (
        location_id SERIAL PRIMARY KEY,
        vehicle_id INT REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        latitude DECIMAL(10,6) NOT NULL,
        longitude DECIMAL(10,6) NOT NULL,
        speed_kmph DECIMAL(6,2),
        fuel_level DECIMAL(6,2),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS maintenance (
        maintenance_id SERIAL PRIMARY KEY,
        vehicle_id INT REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        service_date DATE DEFAULT CURRENT_DATE,
        description TEXT,
        cost DECIMAL(10,2)
      );

      CREATE TABLE IF NOT EXISTS schedules (
        schedule_id SERIAL PRIMARY KEY,
        route_id INT REFERENCES routes(route_id) ON DELETE CASCADE,
        vehicle_id INT REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
        bus_number VARCHAR(50),
        bus_type VARCHAR(50),
        departure TIMESTAMP NOT NULL,
        arrival TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS route_stops (
        stop_id SERIAL PRIMARY KEY,
        route_id INT REFERENCES routes(route_id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        latitude DECIMAL(10,6),
        longitude DECIMAL(10,6),
        sequence INT NOT NULL,
        arrival_time TIME,
        departure_time TIME
      );

      CREATE TABLE IF NOT EXISTS booking_seats (
        id SERIAL PRIMARY KEY,
        booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
        seat_label VARCHAR(10) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'held'
      );

      DO $$ BEGIN
        ALTER TABLE booking_seats ADD COLUMN IF NOT EXISTS passenger_name VARCHAR(100);
        ALTER TABLE booking_seats ADD COLUMN IF NOT EXISTS passenger_age INT;
        ALTER TABLE booking_seats ADD COLUMN IF NOT EXISTS passenger_gender VARCHAR(20);
      EXCEPTION WHEN others THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS fuel_bills (
        bill_id SERIAL PRIMARY KEY,
        vehicle_id INT REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
        liters DECIMAL(10,2) NOT NULL,
        price_per_liter DECIMAL(10,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        station VARCHAR(150),
        receipt_no VARCHAR(100),
        payment_mode VARCHAR(50),
        billed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS toll_bills (
        bill_id SERIAL PRIMARY KEY,
        route_id INT REFERENCES routes(route_id) ON DELETE SET NULL,
        plaza VARCHAR(150),
        amount DECIMAL(12,2) NOT NULL,
        receipt_no VARCHAR(100),
        payment_mode VARCHAR(50),
        billed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permit_bills (
        bill_id SERIAL PRIMARY KEY,
        route_id INT REFERENCES routes(route_id) ON DELETE SET NULL,
        state VARCHAR(100),
        amount DECIMAL(12,2) NOT NULL,
        valid_from DATE,
        valid_to DATE,
        receipt_no VARCHAR(100),
        payment_mode VARCHAR(50),
        billed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agents (
        agent_user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        agent_code TEXT UNIQUE,
        commission_rate NUMERIC DEFAULT 0.05,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offline_bookings (
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
      );
    `);
    // Ensure users role check allows 'agent'
    await pool.query(`DO $$ BEGIN
      BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      EXCEPTION WHEN undefined_object THEN NULL; END;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','customer','driver','company_admin','agent','manager'));
    END $$;`);
    console.log('✅ Tables created or verified.');



    // ---------------------- SEED USERS ----------------------
    const users = [
      { name: 'Admin User',    email: 'admin@fleetease.com',   phone: '9999999999', role: 'admin',          pass: 'admin123',   points: 0 },
      { name: 'Customer One',  email: 'cust1@fleetease.com',   phone: '9999990000', role: 'customer',       pass: 'cust123',    points: 100 },
      { name: 'Driver User',   email: 'driver1@fleetease.com', phone: '9999900000', role: 'driver',         pass: 'driver123',  points: 50 },
      { name: 'Company Admin', email: 'corp@company.com',      phone: '8888888888', role: 'company_admin',  pass: 'corp123',    points: 0 },
      { name: 'Agent One',     email: 'agent@fleetease.com',   phone: '9999900011', role: 'agent',          pass: 'agent123',   points: 0 },
      { name: 'Manager User',  email: 'manager@fleetease.com', phone: '9999900022', role: 'manager',        pass: 'manager123', points: 0 }
    ];

    for (const u of users) {
      const r = await pool.query('SELECT 1 FROM users WHERE email=$1', [u.email]);
      if (!r.rows.length) {
        const hash = await bcrypt.hash(u.pass, 10);
        await pool.query(
          'INSERT INTO users (name, email, phone, role, password_hash, points) VALUES ($1, $2, $3, $4, $5, $6)',
          [u.name, u.email, u.phone, u.role, hash, u.points]
        );
        console.log(`👤 Inserted user: ${u.email}`);
      }
    }
    console.log('✅ User seeding completed.');

    // ---------------------- SEED TESTIMONIALS ----------------------
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
      ['Ravi Kumar', 5, 'Very comfortable journey from Patna to Purnea. Driver was polite and bus was on time.', 5, 5, 5, 5, 5],
      ['Priya Sharma', 4, 'Clean bus and smooth ride. Booking online was easy.', 4, 5, 4, 4, 4],
      ['Amit Singh', 5, 'Best fleet service in Bihar. Will book again.', 5, 4, 5, 5, 5],
    ];
    let addedReviews = 0;
    for (const [name, rating, comment, bus, clean, driver, punctual, comfort] of reviews) {
      const exists = await pool.query('SELECT 1 FROM testimonials WHERE name=$1', [name]);
      if (!exists.rows.length) {
        await pool.query(
          `INSERT INTO testimonials (name, rating, comment, bus_condition, cleanliness, driver_behaviour, punctuality, comfort)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [name, rating, comment, bus, clean, driver, punctual, comfort]
        );
        addedReviews += 1;
      }
    }
    if (addedReviews) console.log(`⭐ Seeded ${addedReviews} testimonials.`);

    // ---------------------- SEED VEHICLES ----------------------
    const v = await pool.query('SELECT 1 FROM vehicles');
    if (!v.rows.length) {
      await pool.query("INSERT INTO vehicles (vehicle_number, type, capacity, status) VALUES ('BR01AB0001', 'Bus-2x2', 40, 'available')");
      await pool.query("INSERT INTO vehicles (vehicle_number, type, capacity, status) VALUES ('BR01AB0002', 'Sleeper', 30, 'available')");
      console.log('🚌 Inserted default vehicles.');
    }

    const v2 = await pool.query('SELECT * FROM vehicles WHERE vehicle_number=$1', ['BR11PA8355']);
    if (!v2.rows.length) {
      await pool.query("INSERT INTO vehicles (vehicle_number, type, capacity, status) VALUES ('BR11PA8355', 'Bus-2x2', 40, 'available')");
      console.log('🚌 Added vehicle BR11PA8355.');
    }

    // ---------------------- SEED ROUTES ----------------------
    const routeCheck = await pool.query('SELECT 1 FROM routes');
    if (!routeCheck.rows.length) {
      const fixed = listFixedRoutes();
      for (const r of fixed) {
        await pool.query(
          'INSERT INTO routes (source, destination, distance_km, fare_per_km) VALUES ($1, $2, $3, $4)',
          [capitalize(r.source), capitalize(r.destination), 0, 0]
        );
      }
      console.log('🗺️ Inserted routes from fixed fare table.');
    }

    // ---------------------- SEED STOPS ----------------------
    async function seedStopsFor(routeSrc, routeDst, stops) {
      const ridRes = await pool.query(
        'SELECT route_id FROM routes WHERE source=$1 AND destination=$2 LIMIT 1',
        [routeSrc, routeDst]
      );
      if (!ridRes.rows.length) return;
      const routeId = ridRes.rows[0].route_id;
      const existing = await pool.query('SELECT 1 FROM route_stops WHERE route_id=$1 LIMIT 1', [routeId]);
      if (existing.rows.length) return;

      let seq = 1;
      for (const s of stops) {
        await pool.query(
          'INSERT INTO route_stops (route_id, name, latitude, longitude, sequence, arrival_time, departure_time) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [routeId, s.name, s.lat || null, s.lng || null, seq++, s.arrival || null, s.departure || null]
        );
      }
      console.log(`🛑 Seeded ${stops.length} stops for ${routeSrc} → ${routeDst}.`);
    }

    await seedStopsFor('Patna', 'Purnea', [
      { name: 'Kankarbagh', lat: 25.602, lng: 85.158, departure: '20:30' },
      { name: 'Gandhi Maidan', lat: 25.615, lng: 85.144, departure: '20:50' },
      { name: 'Bakhtiyarpur', lat: 25.462, lng: 85.526 },
      { name: 'Begusarai', lat: 25.420, lng: 86.130 },
      { name: 'Khagaria', lat: 25.502, lng: 86.473 },
      { name: 'Murliganj', lat: 25.895, lng: 86.996 },
      { name: 'Purnea Bus Stand', lat: 25.778, lng: 87.474, arrival: '05:30' }
    ]);

    await seedStopsFor('Purnea', 'Siliguri', [
      { name: 'Purnea Bus Stand', lat: 25.778, lng: 87.474, departure: '06:30' },
      { name: 'Kishanganj', lat: 26.103, lng: 87.947 },
      { name: 'Bagdogra', lat: 26.700, lng: 88.311 },
      { name: 'Siliguri Tenzing Norgay Bus Terminus', lat: 26.722, lng: 88.428, arrival: '10:30' }
    ]);

    // ---------------------- SEED SCHEDULE ----------------------
    const sch = await pool.query('SELECT 1 FROM schedules');
    if (!sch.rows.length) {
      const rid = (await pool.query("SELECT route_id FROM routes WHERE source='Patna' AND destination='Purnea' LIMIT 1")).rows[0]?.route_id;
      const veh = (await pool.query("SELECT vehicle_id, type FROM vehicles WHERE vehicle_number='BR11PA8355' LIMIT 1")).rows[0];
      if (rid && veh) {
        await pool.query(
          `INSERT INTO schedules (route_id, vehicle_id, bus_number, bus_type, departure, arrival, status)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '9 hours', 'active')`,
          [rid, veh.vehicle_id, 'BR11PA8355', veh.type]
        );
        console.log('🕒 Inserted demo schedule BR11PA8355 Patna→Purnea.');
      }
    }

    // ---------------------- MIGRATE LEGACY BUS TYPES ----------------------
    try{
      await pool.query("UPDATE vehicles SET type='2x2 AC' WHERE LOWER(type) IN ('bus-2x2','2x2','2*2','bus 2x2')");
      await pool.query("UPDATE schedules SET bus_type='2x2 AC' WHERE LOWER(bus_type) IN ('bus-2x2','2x2','2*2','bus 2x2')");
      await pool.query("UPDATE vehicles SET type='2x1 Lower Sleeper AC' WHERE LOWER(type) LIKE '%sleeper%'");
      await pool.query("UPDATE schedules SET bus_type='2x1 Lower Sleeper AC' WHERE LOWER(bus_type) LIKE '%sleeper%'");
      console.log('🔁 Migrated legacy bus types to canonical values.');
    }catch(e){ console.warn('⚠️ Migration warning:', e.message); }

    // ---------------------- SEED DEMO SCHEDULES (ALL TABLED ROUTES) ----------------------
    const demoRoutes = [
      { source:'Purnea', destination:'Siliguri', bus_type:'2x2 AC' },
      { source:'Purnea', destination:'Patna', bus_type:'2x1 Lower Sleeper AC' },
      { source:'Purnea', destination:'Motihari', bus_type:'2x1 48 seat AC' },
      { source:'Purnea', destination:'Muzaffarpur', bus_type:'2x2 Non-AC' },
      { source:'Purnea', destination:'Darbhanga', bus_type:'2x2 AC' },
      { source:'Bhagalpur', destination:'Siliguri', bus_type:'2x1 Lower Sleeper AC' },
      { source:'Siliguri', destination:'Patna', bus_type:'2x1 Lower Sleeper' },
      { source:'Siliguri', destination:'Gaya', bus_type:'2x2 Seat Sleeper' },
      { source:'Purnea', destination:'Bhagalpur', bus_type:'2x2 Non-AC' },
      { source:'Purnea', destination:'Kishanganj', bus_type:'2x2 AC' },
    ];

    for (let i=0; i<demoRoutes.length; i++){
      const dr = demoRoutes[i];
      // Ensure route exists (rough distance and fpk placeholders if unknown)
      let r = await pool.query('SELECT route_id FROM routes WHERE source=$1 AND destination=$2 LIMIT 1', [dr.source, dr.destination]);
      if (!r.rows.length){
        await pool.query('INSERT INTO routes (source, destination, distance_km, fare_per_km) VALUES ($1,$2,$3,$4)', [dr.source, dr.destination, 150, 5]);
        r = await pool.query('SELECT route_id FROM routes WHERE source=$1 AND destination=$2 LIMIT 1', [dr.source, dr.destination]);
      }
      const routeId = r.rows[0]?.route_id;
      if (!routeId) continue;
      // Ensure a vehicle with matching type exists
      let v = await pool.query('SELECT vehicle_id, vehicle_number FROM vehicles WHERE type=$1 LIMIT 1', [dr.bus_type]);
      if (!v.rows.length){
        const vn = `DEMO-${dr.bus_type.replace(/\s+/g,'-').replace(/[^A-Za-z0-9-]/g,'')}-${Math.floor(1000+Math.random()*9000)}`;
        await pool.query('INSERT INTO vehicles (vehicle_number, type, capacity, status) VALUES ($1,$2,$3,$4)', [vn, dr.bus_type, 40, 'available']);
        v = await pool.query('SELECT vehicle_id, vehicle_number FROM vehicles WHERE vehicle_number=$1 LIMIT 1', [vn]);
      }
      const vehId = v.rows[0].vehicle_id; const busNum = v.rows[0].vehicle_number;
      // Check if a schedule already exists for tomorrow for this route
      const existing = await pool.query("SELECT 1 FROM schedules s WHERE s.route_id=$1 AND s.bus_type=$2 AND s.departure::date = (CURRENT_DATE + 1) LIMIT 1", [routeId, dr.bus_type]);
      if (!existing.rows.length){
        await pool.query(
          `INSERT INTO schedules (route_id, vehicle_id, bus_number, bus_type, departure, arrival, status)
           VALUES ($1,$2,$3,$4, NOW() + INTERVAL '1 day' + INTERVAL '${2+i} hours', NOW() + INTERVAL '1 day' + INTERVAL '${5+i} hours', 'active')`,
          [routeId, vehId, busNum, dr.bus_type]
        );
        console.log(`🕒 Seeded demo schedule ${dr.source}→${dr.destination} (${dr.bus_type}).`);
      }
    }

    console.log('✅ All setup steps completed successfully!');
  } catch (err) {
    console.error('❌ Setup error:', err);
  } finally {
    await pool.end();
    console.log('🔒 Database connection closed.');
    process.exit(0);
  }
}

setup();
