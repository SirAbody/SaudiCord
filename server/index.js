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

// Create express app and server
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

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Body parsing middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (must come before static file serving)
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
app.use('/api/dm', directMessageRoutes);
app.use('/api/monitor', monitoringRoutes);
app.use('/api/errors', errorRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/build');
  console.log('Serving static files from:', buildPath);
  app.use(express.static(buildPath));
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
    port: PORT,
    author: 'Made With Love By SirAbody',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling with error logging
const socketHandler = require('./socket/socketHandler');
try {
  socketHandler(io);
  logger.info('Socket.io initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Socket.io', error);
}

// Catch-all route for React app (must be after API routes but before error handlers)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// 404 handler (must be before error handler)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 10000;

// Start server immediately without waiting for database
logger.info('🚀 Starting SaudiCord Server...');
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info('💝 Made With Love By SirAbody');
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 URL: ${process.env.NODE_ENV === 'production' ? 'https://saudicord.onrender.com' : `http://localhost:${PORT}`}`);
  logger.info('✨ Server is ready to accept connections');
  
  // Keep the process alive
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      logger.debug('Server heartbeat - still running');
    }, 30000); // Log every 30 seconds in production
  }
});

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
