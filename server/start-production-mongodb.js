// Production Startup Script for MongoDB
// Made With Love By SirAbody

console.log('===========================================');
console.log('🚀 Starting SaudiCord Production Server');
console.log('📦 Database: MongoDB Atlas');
console.log('💝 Made With Love By SirAbody');
console.log('===========================================');

// Check if we should use MongoDB
const USE_MONGODB = process.env.USE_MONGODB === 'true' || process.env.MONGODB_URI;

if (USE_MONGODB) {
  console.log('[INFO] 🍃 Using MongoDB Atlas backend');
  require('./server-mongodb.js');
} else {
  console.log('[INFO] 🐘 Using PostgreSQL backend');
  require('./index.js');
}
