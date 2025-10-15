// Production Startup Script for MongoDB
// Made With Love By SirAbody

console.log('===========================================');
console.log('🚀 Starting SaudiCord Production Server');
console.log('📦 Database: MongoDB');
console.log('💝 Made With Love By SirAbody');
console.log('===========================================');

// Always use MongoDB
console.log('[INFO] 🍃 Starting MongoDB backend...');
console.log('[INFO] MongoDB URI configured:', !!process.env.MONGODB_URI);

// Start the MongoDB server
require('./server-mongodb.js');
