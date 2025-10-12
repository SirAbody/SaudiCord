// SaudiCord Server - Made With Love By SirAbody
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

// Import utilities
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Ensure required directories exist
require('./startup');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const serverRoutes = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const errorRoutes = require('./routes/errors');
const monitoringRoutes = require('./routes/monitoring');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (must come before static file serving)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/monitor', monitoringRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SaudiCord Server is running',
    author: 'Made With Love By SirAbody',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling with error logging
try {
  socketHandler(io);
  logger.info('Socket.io initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Socket.io', error);
}

// 404 handler (must be before error handler)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 10000;

// Database sync and server start
sequelize.sync({ force: false }).then(async () => {
  logger.info('✅ Database connected and synced');
  
  // Auto-create admin user if not exists
  try {
    const bcrypt = require('bcrypt');
    const { User } = require('./models');
    
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin509', 10);
      await User.create({
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
    }
  } catch (error) {
    logger.warn('Could not create admin user:', error.message);
  }
  
  server.listen(PORT, () => {
    logger.info(`🚀 SaudiCord Server running on port ${PORT}`);
    logger.info('💝 Made With Love By SirAbody');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  });
}).catch(err => {
  logger.error('❌ Unable to connect to database:', err);
  process.exit(1);
});

module.exports = { app, io };
