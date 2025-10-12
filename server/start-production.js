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

// Start the main server
try {
  require('./index.js');
  console.log('✅ Server module loaded successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error(error.stack);
  
  // Even if main server fails, keep a basic server running for health checks
  const express = require('express');
  const path = require('path');
  const app = express();
  const PORT = process.env.PORT || 10000;
  
  // Serve React build even in fallback mode
  const buildPath = path.join(__dirname, '../client/build');
  app.use(express.static(buildPath));
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'DEGRADED', 
      message: 'Server running in fallback mode',
      error: error.message 
    });
  });
  
  // Catch all routes to serve React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚠️ Fallback server running on port ${PORT}`);
    console.log('📌 Main server failed to start, but health checks are available');
    console.log('🌐 Static files served from:', buildPath);
  });
}

console.log('✨ Production startup script initialized');
