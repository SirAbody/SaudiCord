// System Monitoring and Health Check Routes
const express = require('express');
const router = express.Router();
const os = require('os');

// Safely load sequelize
let sequelize;
try {
  const models = require('../models');
  sequelize = models.sequelize;
} catch (err) {
  console.warn('Database models not available for monitoring');
}

// Simple logger for production
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => process.env.NODE_ENV !== 'production' && console.log('[DEBUG]', ...args)
};

// Basic health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'SaudiCord',
    author: 'Made With Love By SirAbody'
  });
});

// Detailed status check
router.get('/status', async (req, res) => {
  try {
    // Check database connection
    let dbStatus = 'disconnected';
    if (sequelize) {
      try {
        await sequelize.authenticate();
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error';
        logger.error('Database health check failed', error);
      }
    } else {
      dbStatus = 'not-configured';
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Get active connections (if available from socket handler)
    const io = req.app.get('io');
    const socketCount = io ? io.engine.clientsCount : 0;

    res.json({
      service: 'SaudiCord',
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: {
        status: dbStatus,
        type: 'PostgreSQL'
      },
      memory: {
        system: {
          total: formatBytes(totalMem),
          free: formatBytes(freeMem),
          used: formatBytes(totalMem - freeMem),
          percentUsed: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
        },
        process: {
          rss: formatBytes(memUsage.rss),
          heapTotal: formatBytes(memUsage.heapTotal),
          heapUsed: formatBytes(memUsage.heapUsed),
          external: formatBytes(memUsage.external)
        }
      },
      connections: {
        websocket: socketCount
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg()
      }
    });
  } catch (error) {
    logger.error('Error getting status', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get system status'
    });
  }
});

// WebSocket test endpoint
router.get('/ws-test', (req, res) => {
  res.json({
    message: 'WebSocket test endpoint',
    socketUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    instructions: 'Connect to the socket server using Socket.io client'
  });
});

// Utility functions
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
