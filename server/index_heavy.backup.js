// SaudiCord Server - Made With Love By SirAbody
// Production-optimized version with performance improvements

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');

// Import configuration
// const config = require('./config/config'); // Not needed for now

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with better error handling
let io;
try {
  const corsOrigins = process.env.NODE_ENV === 'production'
    ? ['https://saudicord.onrender.com', 'http://saudicord.onrender.com']
    : ['http://localhost:3000', 'http://localhost:10000'];

  io = socketIO(server, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  console.log('[INFO] Socket.io initialized with database support');
} catch (error) {
  console.error('[ERROR] Failed to initialize Socket.io:', error);
  io = null;
}

// Middleware
app.use(compression()); // Compress responses
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://saudicord.onrender.com', 'http://saudicord.onrender.com']
    : ['http://localhost:3000', 'http://localhost:10000'],
  credentials: true
}));

// Request logging with unique IDs
const crypto = require('crypto');
app.use((req, res, next) => {
  const requestId = crypto.randomBytes(8).toString('hex');
  req.requestId = requestId;
  console.log(`[REQ-${requestId}] ${req.method} ${req.path}`);
  
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[RES-${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${Date.now() - req.startTime}ms)`);
    originalSend.call(this, data);
  };
  
  req.startTime = Date.now();
  next();
});

// Health check endpoint (must be first)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'client', 'build');
  
  console.log('✅ Serving static files from:', buildPath);
  
  // Check if build directory exists
  if (fs.existsSync(buildPath)) {
    const files = fs.readdirSync(buildPath);
    console.log('📁 Build directory contains:', files.join(', '));
    
    // Serve specific static files with proper caching
    app.get('/manifest.json', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(path.join(buildPath, 'manifest.json'));
    });
    
    app.get('/SaudiCordLogo.png', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.sendFile(path.join(buildPath, 'SaudiCordLogo.png'));
    });
    
    app.get('/favicon.ico', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(path.join(buildPath, 'favicon.ico'));
    });
    
    // Serve static assets with caching
    app.use('/static', express.static(path.join(buildPath, 'static'), {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year for versioned assets
        }
      }
    }));
    
    // Main static serving
    app.use(express.static(buildPath, { 
      maxAge: '1h',
      etag: true
    }));
  } else {
    console.log('❌ Build directory does not exist:', buildPath);
  }
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/voice', require('./routes/voice'));

// Socket.io handlers
if (io) {
  require('./socket/socketHandler')(io);
}

// Error handling middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Serve index.html for all other routes in production (SPA support)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'client', 'build', 'index.html');
    
    if (fs.existsSync(indexPath)) {
      console.log('✅ index.html found at:', indexPath);
      res.sendFile(indexPath);
    } else {
      console.log('❌ index.html not found at:', indexPath);
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SaudiCord - Loading...</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #1a1a1a;
              color: #ffffff;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .container {
              text-align: center;
            }
            .loader {
              border: 3px solid rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              border-top: 3px solid #ff0000;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>SaudiCord</h1>
            <div class="loader"></div>
            <p>Application is loading...</p>
            <p style="font-size: 0.9rem; margin-top: 1rem; opacity: 0.7;">
              If this takes too long, please refresh the page
            </p>
            <p style="font-size: 0.8rem; margin-top: 2rem; opacity: 0.5;">
              Made With Love By SirAbody
            </p>
          </div>
          <script>
            // Auto-refresh after 5 seconds
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          </script>
        </body>
        </html>
      `);
    }
  });
}

// 404 handler (must be before error handler)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Database initialization (optimized for production)
const sequelize = require('./config/database');
const { User, Server, Channel, ServerMember } = require('./models');

let dbInitialized = false;
let dbInitPromise = null;

async function initializeDatabase() {
  if (dbInitialized) return;
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = (async () => {
    try {
      // Connect to database
      await sequelize.authenticate();
      console.log('[INFO] ✅ Database connection established');
      
      // Check if database already has data
      const userCount = await User.count().catch(() => 0);
      
      if (userCount === 0) {
        // Only initialize if database is empty
        await sequelize.sync({ force: true });
        console.log('[INFO] ✅ Database models synced successfully');
        
        // Create default users using init-db script
        const bcrypt = require('bcrypt');
        
        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminUser = await User.create({
          username: 'admin',
          email: 'admin@saudicord.com',
          password: adminPassword,
          displayName: 'Administrator',
          bio: 'SaudiCord Administrator',
          isAdmin: true
        });
        
        // Create test user liongtas
        const lionPassword = await bcrypt.hash('Lion509', 10);
        const lionUser = await User.create({
          username: 'liongtas',
          email: 'liongtas@saudicord.com',
          password: lionPassword,
          displayName: 'Lion',
          bio: 'SaudiCord Member',
          isAdmin: false
        });
        
        // Create SirAbody admin user
        const sirAbodyPassword = await bcrypt.hash('admin123', 10);
        const sirAbodyUser = await User.create({
          username: 'SirAbody',
          email: 'sirabody@saudicord.com',
          password: sirAbodyPassword,
          displayName: 'SirAbody',
          bio: 'Made With Love By SirAbody',
          isAdmin: true
        });
        
        console.log('[INFO] ✅ Default users created');
        
        // Create default server
        const defaultServer = await Server.create({
          name: 'SaudiCord Community',
          description: 'Welcome to SaudiCord - Made With Love By SirAbody',
          icon: null,
          ownerId: adminUser.id,
          inviteCode: 'saudi2025',
          isPublic: true,
          memberCount: 3
        });
        
        // Create default channels
        await Channel.create({
          serverId: defaultServer.id,
          name: 'general',
          type: 'text',
          description: 'General discussion channel',
          position: 0,
          isPrivate: false
        });
        
        await Channel.create({
          serverId: defaultServer.id,
          name: 'voice-chat',
          type: 'voice',
          description: 'General voice channel',
          position: 1,
          isPrivate: false
        });
        
        // Add users as members to server
        await ServerMember.create({
          serverId: defaultServer.id,
          userId: adminUser.id,
          role: 'admin',
          joinedAt: new Date()
        });
        
        await ServerMember.create({
          serverId: defaultServer.id,
          userId: lionUser.id,
          role: 'member',
          joinedAt: new Date()
        });
        
        await ServerMember.create({
          serverId: defaultServer.id,
          userId: sirAbodyUser.id,
          role: 'admin',
          joinedAt: new Date()
        });
        
        console.log('[INFO] ✅ Database initialized with default data');
      } else {
        // Just sync without forcing
        await sequelize.sync();
        console.log('[INFO] ✅ Database connected, found', userCount, 'existing users');
      }
      
      dbInitialized = true;
    } catch (error) {
      console.error('[ERROR] Database initialization failed:', error);
      // Don't crash the server, continue without DB
      dbInitialized = true;
    }
  })();
  
  return dbInitPromise;
}

// Start server
const PORT = process.env.PORT || 10000;

const startServer = () => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('[INFO] ✅ Server running on port', PORT);
    console.log('[INFO] 💝 Made With Love By SirAbody');
    console.log('[INFO] 📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('[INFO] 🌐 URL:', process.env.NODE_ENV === 'production' 
      ? 'https://saudicord.onrender.com' 
      : `http://localhost:${PORT}`);
    console.log('[INFO] ✨ Server is ready to accept connections');
    
    // Log server configuration
    if (process.env.NODE_ENV === 'production') {
      console.log('📋 Server Configuration:');
      console.log('  - Port:', PORT);
      console.log('  - Node version:', process.version);
      console.log('  - Process ID:', process.pid);
      console.log('  - Memory usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
    }
    
    // Initialize database after server starts (non-blocking)
    setTimeout(() => {
      initializeDatabase().catch(console.error);
    }, 1000);
    
    // Keep the process alive with less frequent heartbeat
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        console.log(`[${new Date().toISOString()}] Heartbeat - Memory: ${memUsage}MB, Uptime: ${Math.round(process.uptime())}s`);
      }, 60000); // Log every minute
    }
  });
  
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('[ERROR] Server error:', error);
    }
  });
};

console.log('[INFO] 🚀 Starting SaudiCord Server...');
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    if (sequelize) {
      sequelize.close().then(() => {
        console.log('Database connection closed');
        process.exit(0);
      }).catch(() => {
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    if (sequelize) {
      sequelize.close().then(() => {
        console.log('Database connection closed');
        process.exit(0);
      }).catch(() => {
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = { app, io };
