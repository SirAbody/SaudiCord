// MongoDB Atlas Configuration
const mongoose = require('mongoose');

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.mongodb.net/saudicord?retryWrites=true&w=majority';

// Connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 50, // Maintain up to 50 socket connections
  minPoolSize: 10, // Maintain at least 10 socket connections
  retryWrites: true,
  w: 'majority'
};

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    console.log('[MongoDB] Attempting to connect to MongoDB Atlas...');
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    const conn = await mongoose.connect(MONGODB_URI, mongoOptions);
    
    console.log(`[MongoDB] ✅ Connected successfully to MongoDB Atlas`);
    console.log(`[MongoDB] Database: ${conn.connection.name}`);
    console.log(`[MongoDB] Host: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from MongoDB Atlas');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected to MongoDB Atlas');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error('[MongoDB] ❌ Failed to connect to MongoDB Atlas:', error.message);
    // Retry connection after 5 seconds
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
