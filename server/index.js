// SaudiCord Server - Optimized Version
// Made With Love By SirAbody

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');

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
  
  console.log('[INFO] Socket.io initialized');
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

// Simple request logging (async)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 100) { // Only log slow requests
      console.log(`[SLOW] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
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
    app.use('/static', express.static(path.join(buildPath, 'static'), {
      maxAge: '1y',
      setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      }
    }));
    
    // Serve manifest.json with caching
    app.get('/manifest.json', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(path.join(buildPath, 'manifest.json'));
    });
    
    // Serve logo with caching
    app.get('/SaudiCordLogo.png', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(path.join(buildPath, 'SaudiCordLogo.png'));
    });
    
    // Serve favicon with caching
    app.get('/favicon.ico', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(path.join(buildPath, 'favicon.ico'));
    });
  }
}

// API Routes - Fixed paths
app.use('/auth', require('./routes/auth'));
app.use('/servers', require('./routes/servers'));
app.use('/channels', require('./routes/channels'));
app.use('/messages', require('./routes/messages'));
app.use('/users', require('./routes/users'));
app.use('/voice', require('./routes/voice'));
app.use('/friends', require('./routes/friends'));
app.use('/dm', require('./routes/directMessages'));

// API prefix routes (for compatibility)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/dm', require('./routes/directMessages'));

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
      res.sendFile(indexPath);
    } else {
      console.log('⚠️ index.html not found, serving fallback');
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SaudiCord - Loading...</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: #1a1a1a; 
              color: #fff;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .loading {
              text-align: center;
            }
            .loader {
              border: 4px solid rgba(255, 255, 255, 0.1);
              border-top: 4px solid #FF0000;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loading">
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

// Lightweight database connection (no initialization)
const sequelize = require('./config/database');

// Database check with connection limit
let databaseChecked = false;
async function checkDatabase() {
  if (databaseChecked) {
    console.log('[INFO] Database already checked, skipping...');
    return true;
  }

  try {
    console.log('[INFO] Checking database connection...');
    await sequelize.authenticate();
    console.log('[INFO] ✅ Database connection established');
    
    // Just sync models - no data operations
    await sequelize.sync({ logging: false });
    console.log('[INFO] ✅ Database models synced');
    
    databaseChecked = true;
    return true;
  } catch (error) {
    console.error('[ERROR] ❌ Database connection failed:', error.message);
    return false;
  }
}

// Start server
const startServer = () => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('[INFO] ✅ Server running on port', PORT);
    console.log('[INFO] 💝 Made With Love By SirAbody');
    console.log('[INFO] 📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('[INFO] 🌐 URL:', process.env.NODE_ENV === 'production' 
      ? 'https://saudicord.onrender.com' 
      : `http://localhost:${PORT}`);
    
    // Check database after server starts (non-blocking)
    checkDatabase();
    
    // Memory monitoring with limits
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        if (memUsage > 80) { // Lower threshold
          console.log(`[MEMORY] Memory usage: ${memUsage}MB`);
          
          // Force garbage collection if memory too high
          if (memUsage > 120 && global.gc) {
            console.log('[MEMORY] Forcing garbage collection...');
            global.gc();
          }
          
          // Restart if memory gets critical (should not happen)
          if (memUsage > 200) {
            console.error('[CRITICAL] Memory usage too high, restarting...');
            process.exit(1);
          }
        }
      }, 180000); // Every 3 minutes
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
