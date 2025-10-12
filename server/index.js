// SaudiCord Backend Server
// Made With Love By SirAbody

// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Prevent process from exiting
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Create simple logger wrapper for production
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => process.env.NODE_ENV !== 'production' && console.log('[DEBUG]', ...args),
  // Used by morgan HTTP logger
  http: (...args) => console.log('[HTTP]', ...args)
};

// Import utilities
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Ensure required directories exist
try {
  require('./startup');
} catch (err) {
  console.error('Startup script error:', err);
}

// Import database
let sequelize;
try {
  const models = require('./models');
  sequelize = models.sequelize;
} catch (err) {
  console.warn('Database models could not be loaded:', err.message);
  // Create a dummy sequelize object to prevent crashes
  sequelize = {
    authenticate: () => Promise.reject(new Error('Database not configured')),
    sync: () => Promise.reject(new Error('Database not configured')),
    close: () => Promise.resolve()
  };
}

// Create express app and server with better error handling
const app = express();
app.disable('x-powered-by'); // Security: hide Express header

// Add request ID for debugging
let requestCounter = 0;
app.use((req, res, next) => {
  req.id = ++requestCounter;
  const start = Date.now();
  
  // Log request start
  if (process.env.NODE_ENV === 'production' && !req.path.includes('/api/health')) {
    console.log(`[REQ-${req.id}] ${req.method} ${req.path}`);
  }
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'production' && !req.path.includes('/api/health')) {
      console.log(`[RES-${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
});

const server = http.createServer(app);

// Socket.io configuration with proper CORS for production
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://saudicord.onrender.com', 'http://saudicord.onrender.com']
      : (process.env.CLIENT_URL || "http://localhost:3000"),
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

// Make io accessible to routes
app.set('io', io);

// Trust proxy for Render.com
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, configure for production
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Rate limiting (fixed for production with proxy)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for localhost in development
  skip: (req) => process.env.NODE_ENV === 'development',
  // Trust proxy for production
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      error: 'Too many requests, please try again later.'
    });
  }
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Request logging - skip in production to avoid duplication
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (must come before static file serving)
// Always use regular auth routes when database is available
const authRoutes = require('./routes/auth');

const userRoutes = require('./routes/users');
const serverRoutes = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const voiceRoutes = require('./routes/voice');
const friendRoutes = require('./routes/friends');
const directMessageRoutes = require('./routes/directMessages');
const monitoringRoutes = require('./routes/monitoring');
const errorRoutes = require('./routes/errors');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/friends', friendRoutes);
// Mount DM routes at /api to make endpoints like /api/dm/*
app.use('/api', directMessageRoutes);
app.use('/api/monitor', monitoringRoutes);
app.use('/api/errors', errorRoutes);

// Serve React build in production with proper options and error handling
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const buildPath = path.join(__dirname, '../client/build');
  
  // Check if build directory exists
  if (!fs.existsSync(buildPath)) {
    console.error('⚠️ WARNING: Client build directory not found at:', buildPath);
    console.error('⚠️ Make sure to run "npm run build" before starting the server');
  } else {
    console.log('✅ Serving static files from:', buildPath);
    
    // List files in build directory for debugging
    const files = fs.readdirSync(buildPath).slice(0, 10);
    console.log('📁 Build directory contains:', files.join(', '), files.length > 10 ? '...' : '');
  }
  
  // Serve static files with simpler configuration to avoid issues
  app.use(express.static(buildPath, {
    index: false, // We'll handle index.html manually
    maxAge: 0, // Disable caching temporarily to debug
    etag: false
  }));
  
  // Explicitly handle common static files
  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(buildPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.sendFile(manifestPath);
    } else {
      res.status(404).json({ error: 'Manifest not found' });
    }
  });
  
  app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(buildPath, 'favicon.ico');
    if (fs.existsSync(faviconPath)) {
      res.sendFile(faviconPath);
    } else {
      res.status(204).end(); // No content
    }
  });
  
  // Handle static JS and CSS files explicitly
  app.get('/static/*', (req, res) => {
    const filePath = path.join(buildPath, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      console.error('Static file not found:', req.path);
      res.status(404).send('File not found');
    }
  });
}

// Health check endpoint (works without database)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }
  
  res.json({ 
    status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
    message: 'SaudiCord Server is running',
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    author: 'Made With Love By SirAbody',
    timestamp: new Date().toISOString()
  });
});

// Initialize Socket.io with fallback support
try {
  const socketHandler = require('./socket/socketHandler');
  socketHandler(io);
  logger.info('Socket.io initialized with database support');
} catch (err) {
  // Use fallback handler if main handler fails
  logger.warn('Using fallback socket handler (no database)');
  const socketFallback = require('./socket/socketFallback');
  socketFallback(io);
  logger.info('Socket.io initialized with fallback handler');
}

// Catch-all route for React Router (production only) - MUST be last route before error handlers
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const indexPath = path.join(__dirname, '../client/build/index.html');
  
  // Pre-check if index.html exists for better performance
  const indexExists = fs.existsSync(indexPath);
  
  if (indexExists) {
    console.log('✅ index.html found at:', indexPath);
  } else {
    console.error('⚠️ index.html NOT found at:', indexPath);
  }
  
  app.get('*', (req, res, next) => {
    // Skip API routes, socket.io, and static asset routes
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/socket.io/') || 
        req.path.startsWith('/uploads/') ||
        req.path.includes('.')) { // Skip files with extensions
      return next();
    }
    
    if (indexExists) {
      // Send index.html for all client-side routes
      res.sendFile(indexPath);
    } else {
      // Serve a simple HTML page if build is not ready
      res.status(503).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SaudiCord - Loading</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(0,0,0,0.3);
              border-radius: 10px;
              backdrop-filter: blur(10px);
            }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            p { font-size: 1.2rem; opacity: 0.9; }
            .loader {
              margin: 2rem auto;
              border: 3px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top: 3px solid white;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
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

const PORT = process.env.PORT || 10000;

// Start server with better error handling
logger.info('🚀 Starting SaudiCord Server...');

const startServer = () => {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`✅ Server running on port ${PORT}`);
    logger.info('💝 Made With Love By SirAbody');
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 URL: ${process.env.NODE_ENV === 'production' ? 'https://saudicord.onrender.com' : `http://localhost:${PORT}`}`);
    logger.info('✨ Server is ready to accept connections');
    
    // Log server configuration
    if (process.env.NODE_ENV === 'production') {
      console.log('📋 Server Configuration:');
      console.log('  - Port:', PORT);
      console.log('  - Node version:', process.version);
      console.log('  - Process ID:', process.pid);
      console.log('  - Memory usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
    }
    
    // Keep the process alive with less frequent heartbeat
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        console.log(`[${new Date().toISOString()}] Heartbeat - Memory: ${memUsage}MB, Uptime: ${Math.round(process.uptime())}s`);
      }, 60000); // Log every minute in production
    }
  });
  
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      logger.error('Server error:', error);
    }
  });
};

startServer();

// Try to connect to database (non-blocking)
const shouldResetDB = process.env.RESET_DB === 'true';
sequelize.authenticate()
  .then(() => {
    logger.info('✅ Database connection established successfully');
    return sequelize.sync({ force: shouldResetDB });
  })
  .then(async () => {
    logger.info('✅ Database models synced successfully');
  
  // Auto-create admin user and default data if not exists
  try {
    const bcrypt = require('bcrypt');
    const { User, Server, Channel } = require('./models');
    
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin509', 10);
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@saudicord.com',
        displayName: 'Administrator',
        password: hashedPassword,
        status: 'offline',
        avatar: null,
        bio: 'System Administrator - Made With Love By SirAbody',
        lastSeen: new Date()
      });
      logger.info('✅ Admin user created (username: admin, password: admin509)');
      
      // Create regular user (Liongtas)
      const lionPassword = await bcrypt.hash('Lion509', 10);
      const lionUser = await User.create({
        username: 'Liongtas',
        email: 'liongtas@saudicord.com',
        displayName: 'Lion',
        password: lionPassword,
        status: 'offline',
        avatar: null,
        bio: 'SaudiCord Member',
        lastSeen: new Date()
      });
      logger.info('✅ Regular user Liongtas created (username: Liongtas, password: Lion509)');
      
      // Create default server
      const defaultServer = await Server.create({
        name: 'SaudiCord Community',
        description: 'Welcome to SaudiCord - Made With Love By SirAbody',
        icon: null,
        ownerId: adminUser.id,
        inviteCode: 'saudi2025',
        isPublic: true,
        memberCount: 1
      });
      logger.info('✅ Default server created');
      
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
      logger.info('✅ Default channels created');
      
      // Add users to server
      await defaultServer.addMember(adminUser);
      await defaultServer.addMember(lionUser);
      await defaultServer.update({ memberCount: 2 });
      logger.info('✅ Users added to default server');
    } else {
      // Check if Liongtas exists, create if not
      const lionExists = await User.findOne({ where: { username: 'Liongtas' } });
      if (!lionExists) {
        const lionPassword = await bcrypt.hash('Lion509', 10);
        await User.create({
          username: 'Liongtas',
          email: 'liongtas@saudicord.com',
          displayName: 'Lion',
          password: lionPassword,
          status: 'offline',
          avatar: null,
          bio: 'SaudiCord Member',
          lastSeen: new Date()
        });
        logger.info('✅ Regular user Liongtas created');
      }
    }
  } catch (error) {
    logger.warn('Could not create default data:', error.message);
  }
  
  logger.info('✅ Database initialized with default data');
}).catch(err => {
  logger.error('❌ Database connection failed');
  logger.error('Error details:', err.message);
  
  // Check common issues
  if (err.message.includes('ECONNREFUSED')) {
    logger.error('⚠️  Make sure PostgreSQL is running and accessible');
  }
  if (err.message.includes('authentication')) {
    logger.error('⚠️  Check your database credentials in environment variables');
  }
  if (err.message.includes('database') && err.message.includes('does not exist')) {
    logger.error('⚠️  The database does not exist. Please create it first.');
  }
  
  logger.error('📋 Required environment variables:');
  logger.error('   DATABASE_URL or (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
  logger.error('   Current DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  
  // Server is already running, just log the database status
  logger.warn('⚠️  Server running without database connection');
  logger.info('📌 Health check and static files are still available');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    sequelize.close().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    sequelize.close().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  });
});

module.exports = { app, io };
