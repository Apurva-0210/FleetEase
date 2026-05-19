const jwt = require('jsonwebtoken');

/**
 * Create a test JWT token
 * @param {Object} payload - The payload to include in the token
 * @returns {string} JWT token
 */
const createTestToken = (payload = {}) => {
  const defaultPayload = {
    user_id: 1,
    email: 'test@example.com',
    role: 'driver',
    ...payload
  };

  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

/**
 * Mock Express request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request object
 */
const mockRequest = (options = {}) => {
  const defaults = {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { user_id: 1, role: 'user' },
    method: 'GET',
    path: '/',
    cookies: {},
    ip: '127.0.0.1',
    protocol: 'http'
  };

  // Merge defaults with provided options
  const config = { ...defaults, ...options };
  
  // Create the request object
  const req = {
    ...config,
    get: function(header) {
      return this.headers[header] || '';
    }
  };
  
  return req;
};

/**
 * Mock Express response object
 * @returns {Object} Mock response object
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Mock Express next function
 * @returns {Function} Mock next function
 */
const mockNext = () => jest.fn();

/**
 * Generate test data for GPS locations
 * @param {number} count - Number of locations to generate
 * @param {Object} overrides - Override default values
 * @returns {Array} Array of location objects
 */
const generateTestLocations = (count = 10, overrides = {}) => {
  const locations = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timeOffset = i * 5 * 60 * 1000; // 5 minutes apart
    const timestamp = new Date(now.getTime() - timeOffset);
    
    locations.push({
      location_id: i + 1,
      vehicle_id: overrides.vehicle_id || 1,
      latitude: 12.9716 + (Math.random() * 0.01 - 0.005), // Small random offset
      longitude: 77.5946 + (Math.random() * 0.01 - 0.005), // Small random offset
      speed_kmph: Math.random() * 100,
      fuel_level: 50 + Math.random() * 50, // 50-100%
      heading_degrees: Math.floor(Math.random() * 360),
      accuracy_meters: 5 + Math.random() * 20, // 5-25 meters
      status: ['stopped', 'moving', 'idle'][Math.floor(Math.random() * 3)],
      updated_at: timestamp.toISOString(),
      ...overrides
    });
  }
  
  return locations;
};

module.exports = {
  createTestToken,
  mockRequest,
  mockResponse,
  mockNext,
  generateTestLocations
};
