require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize socket handlers
require('./src/sockets/index')(io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io to request (so routes can emit events)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/activities', require('./src/routes/activities'));
app.use('/api/groups', require('./src/routes/groups'));
app.use('/api/feed', require('./src/routes/feed'));
app.use('/api/leaderboard', require('./src/routes/leaderboard'));
app.use('/api/users', require('./src/routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Your Status API is running 🚀',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Your Status API running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🕐 Server time: ${new Date().toISOString()}`);
});
