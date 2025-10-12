// Debug version of main server
console.log('=== Starting SaudiCord Debug Server ===');

// Catch all errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

try {
  console.log('1. Loading environment...');
  require('dotenv').config();
  console.log('   ✓ Environment loaded');
  
  console.log('2. Loading modules...');
  const express = require('express');
  console.log('   ✓ Express loaded');
  const http = require('http');
  console.log('   ✓ HTTP loaded');
  const socketIo = require('socket.io');
  console.log('   ✓ Socket.io loaded');
  const cors = require('cors');
  console.log('   ✓ CORS loaded');
  const path = require('path');
  console.log('   ✓ Path loaded');
  const helmet = require('helmet');
  console.log('   ✓ Helmet loaded');
  const compression = require('compression');
  console.log('   ✓ Compression loaded');
  const morgan = require('morgan');
  console.log('   ✓ Morgan loaded');
  const rateLimit = require('express-rate-limit');
  console.log('   ✓ Rate limit loaded');
  
  console.log('3. Creating app...');
  const app = express();
  const server = http.createServer(app);
  console.log('   ✓ App and server created');
  
  console.log('4. Setting up Socket.io...');
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  console.log('   ✓ Socket.io configured');
  
  console.log('5. Setting up middleware...');
  app.use(cors());
  app.use(express.json());
  console.log('   ✓ Basic middleware added');
  
  console.log('6. Adding routes...');
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
  });
  console.log('   ✓ Health route added');
  
  // Add all API routes
  try {
    // Use simple auth routes without database
    const authRoutes = require('./routes/auth-simple');
    app.use('/api/auth', authRoutes);
    console.log('   ✓ Auth routes loaded (simple mode)');
    
    // Try to load other routes
    try {
      const userRoutes = require('./routes/users');
      app.use('/api/users', userRoutes);
    } catch (e) {
      console.log('   ⚠ Users routes skipped');
    }
    
    try {
      const serverRoutes = require('./routes/servers');
      app.use('/api/servers', serverRoutes);
    } catch (e) {
      console.log('   ⚠ Servers routes skipped');
    }
    
    try {
      const channelRoutes = require('./routes/channels');
      app.use('/api/channels', channelRoutes);
    } catch (e) {
      console.log('   ⚠ Channels routes skipped');
    }
    
    console.log('   ✓ Core API routes configured');
  } catch (err) {
    console.error('   ✗ Failed to load routes:', err.message);
  }
  
  console.log('7. Loading startup script...');
  try {
    require('./startup');
    console.log('   ✓ Startup script executed');
  } catch (err) {
    console.error('   ✗ Startup script failed:', err.message);
  }
  
  console.log('8. Loading socket handler...');
  try {
    const socketHandler = require('./socket/socketHandler');
    socketHandler(io);
    console.log('   ✓ Socket handler loaded');
  } catch (err) {
    console.error('   ✗ Socket handler failed:', err.message);
    console.error(err.stack);
  }
  
  const PORT = process.env.PORT || 5000;
  console.log(`9. Starting server on port ${PORT}...`);
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('=================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log('💝 Made With Love By SirAbody');
    console.log('=================================');
    
    // Keep alive
    setInterval(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Server heartbeat`);
    }, 30000);
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
} catch (error) {
  console.error('FATAL ERROR:', error);
  console.error(error.stack);
  process.exit(1);
}
