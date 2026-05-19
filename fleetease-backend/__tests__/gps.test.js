const request = require('supertest');
const app = require('../server');
const db = require('../db');
const { createTestToken } = require('./testUtils');

// Mock data
const mockVehicle = {
  vehicle_id: 1,
  vehicle_number: 'KA01AB1234',
  type: 'AC Sleeper',
  capacity: 40,
  status: 'active'
};

const mockLocation = {
  location_id: 1,
  vehicle_id: 1,
  latitude: 12.9716,
  longitude: 77.5946,
  speed_kmph: 45.5,
  fuel_level: 75.0,
  status: 'moving',
  updated_at: new Date().toISOString()
};

describe('GPS Tracking API', () => {
  let token;
  let server;

  beforeAll(async () => {
    // Create a test token
    token = createTestToken({ user_id: 1, role: 'driver' });
    
    // Start the server
    server = app.listen(process.env.PORT);
  });

  afterAll(async () => {
    // Close the server
    await server.close();
  });

  describe('POST /api/v1/gps/update', () => {
    it('should update vehicle location successfully', async () => {
      // Mock database responses
      db.query.mockResolvedValueOnce({ rows: [mockLocation] }); // Insert location
      db.query.mockResolvedValueOnce({ rowCount: 1 }); // Update vehicle
      db.query.mockResolvedValueOnce({ rows: [] }); // No active schedule

      const response = await request(app)
        .post('/api/v1/gps/update')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicle_id: 1,
          latitude: 12.9716,
          longitude: 77.5946,
          speed_kmph: 45.5,
          fuel_level: 75.0,
          status: 'moving'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('location');
      expect(response.body.location).toHaveProperty('latitude', 12.9716);
      expect(response.body.location).toHaveProperty('longitude', 77.5946);
    });

    it('should return 400 for invalid location data', async () => {
      const response = await request(app)
        .post('/api/v1/gps/update')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicle_id: 'invalid',
          latitude: 'not-a-number',
          longitude: 200, // Invalid longitude
          speed_kmph: -10 // Invalid speed
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/gps/last/:vehicle_id', () => {
    it('should return the last known location of a vehicle', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockLocation] });

      const response = await request(app)
        .get('/api/v1/gps/last/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('vehicle_id', 1);
      expect(response.body).toHaveProperty('latitude', 12.9716);
      expect(response.body).toHaveProperty('longitude', 77.5946);
    });

    it('should return 404 if no location data is found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/gps/last/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/gps/history/:vehicle_id', () => {
    it('should return location history for a vehicle', async () => {
      db.query.mockResolvedValueOnce({ 
        rows: [
          { ...mockLocation, location_id: 1, updated_at: '2023-01-01T10:00:00Z' },
          { ...mockLocation, location_id: 2, updated_at: '2023-01-01T09:30:00Z' }
        ] 
      });

      const response = await request(app)
        .get('/api/v1/gps/history/1?start_time=2023-01-01T00:00:00Z&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('location_id');
      expect(response.body[0]).toHaveProperty('updated_at');
    });
  });

  describe('GET /api/v1/gps/active', () => {
    it('should return active vehicles with their locations', async () => {
      const mockActiveVehicles = [
        {
          vehicle_id: 1,
          vehicle_number: 'KA01AB1234',
          type: 'AC Sleeper',
          latitude: 12.9716,
          longitude: 77.5946,
          speed_kmph: 45.5,
          updated_at: new Date().toISOString(),
          schedule_id: 1,
          departure: new Date().toISOString(),
          arrival: new Date(Date.now() + 3600000).toISOString(),
          schedule_status: 'on_route',
          source: 'Bangalore',
          destination: 'Mysore'
        }
      ];

      db.query.mockResolvedValueOnce({ rows: mockActiveVehicles });

      const response = await request(app)
        .get('/api/v1/gps/active')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('vehicle_id');
      expect(response.body[0]).toHaveProperty('latitude');
      expect(response.body[0]).toHaveProperty('longitude');
      expect(response.body[0]).toHaveProperty('schedule_status');
    });
  });
});
