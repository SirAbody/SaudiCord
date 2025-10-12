// SaudiCord Server - Made With Love By SirAbody
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Ensure required directories exist
require('./startup');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const serverRoutes = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');

// Import socket handlers
const socketHandler = require('./socket/socketHandler');

// Import database
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);

// Socket.io configuration with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Note: React app will be served from a separate static site on Render
// This is only for local development or single-server deployments

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SaudiCord Server is running',
    author: 'Made With Love By SirAbody',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling
socketHandler(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

const PORT = process.env.PORT || 10000;

// Database sync and server start
sequelize.sync({ force: false }).then(() => {
  console.log('✅ Database connected and synced');
  server.listen(PORT, () => {
    console.log(`🚀 SaudiCord Server running on port ${PORT}`);
    console.log('💝 Made With Love By SirAbody');
  });
}).catch(err => {
  console.error('❌ Unable to connect to database:', err);
});

module.exports = { app, io };
