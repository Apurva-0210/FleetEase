require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const tripRoutes = require('./routes/trips');
const gpsRoutes = require('./routes/gps');
const paymentRoutes = require('./routes/payments');
const invoiceRoutes = require('./routes/invoices');
const contactRoutes = require('./routes/contact');
const usersRoutes = require('./routes/users');
const corpBookingsRoutes = require('./routes/corpBookings');
const vehiclesRoutes = require('./routes/vehicles');
const managerRoutes = require('./routes/manager');
const agentRoutes = require('./routes/agent');
const adminSeatsHandler = require('./routes/adminSeats');
const testimonialRoutes = require('./routes/testimonials');
const fareRoutes = require('./routes/fare');
const scheduleRoutes = require('./routes/schedules');
const billRoutes = require('./routes/bills');
const adminSummary = require('./routes/adminSummary');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./middleware/errorHandler').AppError;
const auth = require('./middleware/auth');

// Create Express app
const app = express();

// Trust proxy disabled for local/dev to avoid express-rate-limit warnings

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: [
    'https://fleet-ease-k3dce8sd4-apurva-kumar-s-projects.vercel.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

// Limit requests from same API
const limiter = rateLimit({
  max: 1000, // 1000 requests
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'
  ]
}));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log('Cookies: ', req.cookies);
  next();
});

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://fleet-ease-k3dce8sd4-apurva-kumar-s-projects.vercel.app',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.set('io', io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/gps', gpsRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
app.use('/api/v1/fare', fareRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/routes', tripRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/corp-bookings', corpBookingsRoutes);
app.use('/api/v1/vehicles', vehiclesRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/agent', agentRoutes);
app.get('/api/v1/seats/:schedule_id', adminSeatsHandler);
app.get('/api/v1/admin/summary', auth(['admin']), adminSummary);

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    next(new Error('Authentication failed'));
  }
});

// Track active connections
const activeConnections = new Map();

io.on('connection', (socket) => {
  const userId = socket.user?.user_id;
  console.log(`Socket connected: ${socket.id} (User: ${userId || 'unknown'})`);
  
  // Track connection
  activeConnections.set(socket.id, {
    userId,
    role: socket.user?.role,
    connectedAt: new Date(),
    rooms: new Set()
  });

  // Join vehicle room
  socket.on('join_vehicle', (vehicleId) => {
    if (typeof vehicleId !== 'string' && typeof vehicleId !== 'number') {
      return socket.emit('error', { message: 'Invalid vehicle ID' });
    }
    const room = `vehicle_${vehicleId}`;
    socket.join(room);
    const conn = activeConnections.get(socket.id);
    if (conn) {
      conn.rooms.add(room);
    }
    console.log(`Socket ${socket.id} joined vehicle room: ${room}`);
  });

  // Join schedule room
  socket.on('join_schedule', (scheduleId) => {
    if (typeof scheduleId !== 'string' && typeof scheduleId !== 'number') {
      return socket.emit('error', { message: 'Invalid schedule ID' });
    }
    const room = `schedule_${scheduleId}`;
    socket.join(room);
    const conn = activeConnections.get(socket.id);
    if (conn) {
      conn.rooms.add(room);
    }
    console.log(`Socket ${socket.id} joined schedule room: ${room}`);
  });

  // Heartbeat/ping
  socket.on('ping', (cb) => {
    if (typeof cb === 'function') {
      cb({ serverTime: Date.now() });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    activeConnections.delete(socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

// Periodically clean up disconnected clients
setInterval(() => {
  io.emit('ping', { timestamp: Date.now() });
}, 30000); // 30 seconds

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log('🌐 API available');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle SIGTERM (for Heroku and other platforms)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});