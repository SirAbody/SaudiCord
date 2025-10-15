// Test MongoDB Connection - FINAL
const mongoose = require('mongoose');

// Connection string with correct password and cluster
const connectionString = 'mongodb+srv://abood3alshrary_db_user:23U4pKSr6zNEnf0C@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord';

// Connection options (same as production)
const mongoOptions = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority'
};

async function testConnection() {
  try {
    console.log('Testing MongoDB Atlas connection...');
    console.log('URI:', connectionString.replace(/:[^:@]+@/, ':****@'));
    
    await mongoose.connect(connectionString, mongoOptions);
    
    console.log('✅ Connected successfully to MongoDB Atlas!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    console.log('Ready State:', mongoose.connection.readyState);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:');
    collections.forEach(col => console.log('  -', col.name));
    
    // Check for admin user
    const User = require('./schemas/User');
    const adminCount = await User.countDocuments({ username: 'admin' });
    console.log('\nAdmin users:', adminCount);
    
    await mongoose.disconnect();
    console.log('\n✅ Test passed! MongoDB connection is working.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\nPossible issues:');
      console.log('1. Check your internet connection');
      console.log('2. Verify cluster name: saudicord.sfzfre8');
      console.log('3. Check DNS resolution');
    } else if (error.message.includes('authentication')) {
      console.log('\nAuthentication failed:');
      console.log('1. Check password is correct');
      console.log('2. Verify user exists in Database Access');
    } else if (error.message.includes('keepalive')) {
      console.log('\nOption error:');
      console.log('Remove keepAlive from connection options');
    }
  }
  
  process.exit(0);
}

testConnection();
