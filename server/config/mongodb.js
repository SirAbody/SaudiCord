// MongoDB Atlas Configuration
const mongoose = require('mongoose');

// MongoDB Atlas connection string - WITH CORRECT PASSWORD!
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://abood3alshrary_db_user:23U4pKSr6zNEnf0C@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord';

// For production, should be set in environment variables
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  console.warn('[MongoDB] Warning: Using default connection string. Set MONGODB_URI in production!');
}

// Connection options - FIXED FOR MONGODB DRIVER
const mongoOptions = {
  serverSelectionTimeoutMS: 15000, // 15 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10, // Reduce pool size for free tier
  minPoolSize: 2, // Minimum connections
  retryWrites: true,
  w: 'majority'
  // Removed keepAlive - not supported by MongoDB driver
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const isLocal = MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1');
    console.log(`[MongoDB] Attempting to connect to ${isLocal ? 'Local MongoDB' : 'MongoDB Atlas'}...`);
    console.log(`[MongoDB] URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    const conn = await mongoose.connect(MONGODB_URI, mongoOptions);
    
    console.log(`[MongoDB] ✅ Connected successfully to ${isLocal ? 'Local MongoDB' : 'MongoDB Atlas'}`);
    console.log(`[MongoDB] Database: ${conn.connection.name}`);
    console.log(`[MongoDB] Host: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from MongoDB');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected to MongoDB');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error('[MongoDB] ❌ Failed to connect:', error.message);
    
    // In production, allow server to start anyway for health checks
    if (process.env.NODE_ENV === 'production') {
      console.log('[MongoDB] Running without database connection (degraded mode)');
      return null;
    }
    
    // In development, retry connection
    console.log('[MongoDB] Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Test connection
const testConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('[MongoDB] ✅ Connection test successful');
    return true;
  } catch (error) {
    console.error('[MongoDB] ❌ Connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  connectDB,
  testConnection,
  mongoose
};
