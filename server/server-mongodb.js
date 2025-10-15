// Main Server File with MongoDB Atlas Integration
// Made With Love By SirAbody

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// MongoDB Connection
const { connectDB, testConnection } = require('./config/mongodb');

// MongoDB Schemas
const User = require('./schemas/User');
const Server = require('./schemas/Server');
const Channel = require('./schemas/Channel');
const Message = require('./schemas/Message');
const DirectMessage = require('./schemas/DirectMessage');
const Friendship = require('./schemas/Friendship');
const VoiceCall = require('./schemas/VoiceCall');
const Role = require('./schemas/Role');

// Express App
const app = express();
const server = http.createServer(app);

// Port Configuration
const PORT = process.env.PORT || 5000;

// Socket.io Configuration
const io = socketIO(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://saudicord.onrender.com', 'https://saudicord.com']
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://saudicord.onrender.com', 'https://saudicord.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth-mongodb'));
app.use('/api/users', require('./routes/users-mongodb'));
app.use('/api/servers', require('./routes/servers-mongodb'));
app.use('/api/channels', require('./routes/channels-mongodb'));
app.use('/api/messages', require('./routes/messages-mongodb'));
app.use('/api/friends', require('./routes/friends-mongodb'));
app.use('/api/dm', require('./routes/dm-mongodb'));
app.use('/api/voice', require('./routes/voice-mongodb'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({
      status: 'OK',
      database: isConnected ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Socket.io Connection Handler
const socketHandler = require('./socket/socketHandler-mongodb');
socketHandler(io);

// Start Server
async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await connectDB();
    
    // Initialize default data
    await initializeDefaultData();
    
    // Start Express server
    server.listen(PORT, () => {
      console.log(`[Server] ✅ Server running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] MongoDB: Connected to Atlas`);
    });
  } catch (error) {
    console.error('[Server] ❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize default data
async function initializeDefaultData() {
  try {
    console.log('[MongoDB] Checking default data...');
    
    // Check if admin user exists
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      console.log('[MongoDB] Creating default admin user...');
      const admin = new User({
        username: 'admin',
        email: 'admin@saudicord.com',
        password: 'admin509',
        displayName: 'Administrator',
        bio: 'SaudiCord Administrator',
        isAdmin: true,
        isVerified: true
      });
      await admin.save();
      console.log('[MongoDB] ✅ Admin user created');
    }
    
    // Check if test user exists
    const userExists = await User.findOne({ username: 'liongtas' });
    if (!userExists) {
      console.log('[MongoDB] Creating default test user...');
      const testUser = new User({
        username: 'liongtas',
        email: 'liongtas@saudicord.com',
        password: 'Lion509',
        displayName: 'Lion',
        bio: 'SaudiCord Member',
        isAdmin: false
      });
      await testUser.save();
      console.log('[MongoDB] ✅ Test user created');
    }
    
    // Check if default server exists
    const serverExists = await Server.findOne({ name: 'SaudiCord Community' });
    if (!serverExists) {
      console.log('[MongoDB] Creating default community server...');
      
      const admin = await User.findOne({ username: 'admin' });
      
      const communityServer = new Server({
        name: 'SaudiCord Community',
        description: 'The official SaudiCord community server',
        owner: admin._id,
        isPublic: true
      });
      
      // Generate invite code
      communityServer.generateInviteCode();
      
      // Add admin as member
      await communityServer.addMember(admin._id);
      await communityServer.save();
      
      // Create default channels
      const generalChannel = new Channel({
        name: 'general',
        type: 'text',
        description: 'General discussion',
        server: communityServer._id,
        position: 0
      });
      await generalChannel.save();
      
      const voiceChannel = new Channel({
        name: 'voice-chat',
        type: 'voice',
        description: 'Voice communication',
        server: communityServer._id,
        position: 1
      });
      await voiceChannel.save();
      
      // Update server with channels
      communityServer.channels.push(generalChannel._id, voiceChannel._id);
      communityServer.settings.defaultChannel = generalChannel._id;
      await communityServer.save();
      
      // Create default roles
      const everyoneRole = await Role.createDefaultRole(communityServer._id);
      const adminRole = await Role.createAdminRole(communityServer._id);
      
      communityServer.roles.push(everyoneRole._id, adminRole._id);
      await communityServer.save();
      
      console.log('[MongoDB] ✅ Default server created with invite code:', communityServer.inviteCode);
    }
    
    console.log('[MongoDB] ✅ Default data initialized');
  } catch (error) {
    console.error('[MongoDB] Error initializing default data:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
