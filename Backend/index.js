require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');

// Connect to MongoDB
connectDB();

// Initialize Firebase Admin
require('./src/config/firebase');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Initialize socket handlers
require('./src/sockets/index')(io);

// Middleware
app.use(cors({
    origin: "*",
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const fs = require('fs');

// Serve uploaded files statically (safely resolve directory for serverless environments)
let staticUploadsDir = path.join(__dirname, 'uploads');
try {
    if (!fs.existsSync(staticUploadsDir)) {
        fs.mkdirSync(staticUploadsDir, { recursive: true });
    }
} catch (err) {
    staticUploadsDir = path.join(require('os').tmpdir(), 'uploads');
    try {
        if (!fs.existsSync(staticUploadsDir)) {
            fs.mkdirSync(staticUploadsDir, { recursive: true });
        }
    } catch (e) { }
}
app.use('/uploads', express.static(staticUploadsDir));

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

// Health check + DB debug
app.get('/api/health', async (req, res) => {
    const mongoose = require('mongoose');
    const Activity = require('./src/models/Activity');
    const User = require('./src/models/User');
    
    try {
        const dbState = mongoose.connection.readyState;
        const dbStateStr = ['disconnected','connected','connecting','disconnecting'][dbState] || 'unknown';
        const userCount = await User.countDocuments();
        const activityCount = await Activity.countDocuments();
        const recentActivities = await Activity.find({ endTime: { $ne: null } })
            .sort({ startTime: -1 })
            .limit(5)
            .select('name category duration startTime endTime user');

        res.json({
            success: true,
            message: 'Your Status API is running 🚀',
            timestamp: new Date().toISOString(),
            db: { state: dbStateStr, users: userCount, activities: activityCount },
            recentActivities,
        });
    } catch (e) {
        res.json({ success: true, message: 'API running but DB query failed', error: e.message });
    }
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

// Auto-stop activities paused for > 30 minutes
const Activity = require('./src/models/Activity');
setInterval(async () => {
    try {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        const expired = await Activity.find({
            endTime: null,
            isPaused: true,
            pausedAt: { $lt: thirtyMinsAgo }
        });

        for (const act of expired) {
            act.endTime = act.pausedAt;
            act.duration = Math.max(0, Math.floor((act.endTime - act.startTime) / 1000) - (act.totalPausedDuration || 0));
            await act.save();
        }
        if (expired.length > 0) {
            console.log(`🕐 Auto-stopped ${expired.length} activities (paused > 30m).`);
        }
    } catch (err) {
        console.error('Auto-stop cron error:', err);
    }
}, 5 * 60 * 1000); // Every 5 mins

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Your Status API running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🕐 Server time: ${new Date().toISOString()}`);
});
