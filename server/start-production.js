#!/usr/bin/env node
// Production start script for Render.com
// Made With Love By SirAbody

console.log('===========================================');
console.log('🚀 Starting SaudiCord Production Server');
console.log('💝 Made With Love By SirAbody');
console.log('===========================================');

// Handle uncaught errors to prevent server crash
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  console.error(err.stack);
  // Don't exit - keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] at:', promise, 'reason:', reason);
  // Don't exit - keep the server running
});

// Catch SIGTERM and SIGINT signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Keep the process alive
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Server heartbeat - still running`);
}, 60000); // Every minute

// Start the main server with improved error handling
try {
  require('./index.js');
  console.log('✅ Server module loaded successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error(error.stack);
  
  // Even if main server fails, keep a basic server running for health checks
  const express = require('express');
  const path = require('path');
  const fs = require('fs');
  const app = express();
  const PORT = process.env.PORT || 10000;
  
  // Serve React build even in fallback mode
  const buildPath = path.join(__dirname, '../client/build');
  
  // Check if build exists
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    
    console.log('✅ Static files directory found:', buildPath);
  } else {
    console.warn('⚠️ Static files directory not found:', buildPath);
  }
  
  // Add CORS for fallback mode
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'DEGRADED', 
      message: 'Server running in fallback mode',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  // Serve manifest.json explicitly
  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(buildPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.sendFile(manifestPath);
    } else {
      res.status(404).json({ error: 'Manifest not found' });
    }
  });
  
  // Catch all routes to serve React app
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not available in fallback mode' });
    }
    
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SaudiCord - Deploying</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              background: #1a1a1a;
              color: white;
            }
            .container { 
              text-align: center;
              padding: 20px;
            }
            h1 { color: #5865F2; }
            p { color: #ccc; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>SaudiCord is Deploying</h1>
            <p>The application is being deployed. Please refresh in a few moments.</p>
            <p><small>Made With Love By SirAbody</small></p>
          </div>
        </body>
        </html>
      `);
    }
  });
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚠️ Fallback server running on port ${PORT}`);
    console.log('📌 Main server failed to start, but health checks are available');
    console.log('🌐 URL: https://saudicord.onrender.com');
  });
}

console.log('✨ Production startup script initialized');
