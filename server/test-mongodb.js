// Test MongoDB Connection
const mongoose = require('mongoose');

// Try different connection string formats
const connectionStrings = [
  'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@cluster0.mongodb.net/saudicord?retryWrites=true&w=majority',
  'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@cluster0.rj2vx.mongodb.net/saudicord?retryWrites=true&w=majority',
  'mongodb://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@cluster0.mongodb.net:27017/saudicord?ssl=true&authSource=admin'
];

async function testConnection(uri, index) {
  console.log(`\nTesting connection ${index + 1}:`);
  console.log(`URI: ${uri.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    console.log(`✅ Connection ${index + 1} successful!`);
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    
    // Test ping
    await mongoose.connection.db.admin().ping();
    console.log('✅ Ping successful!');
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Connection ${index + 1} failed:`, error.message);
    if (error.code) console.log('Error code:', error.code);
    if (error.codeName) console.log('Error name:', error.codeName);
    return false;
  }
}

async function main() {
  console.log('===========================================');
  console.log('Testing MongoDB Atlas Connections');
  console.log('===========================================');
  
  let success = false;
  for (let i = 0; i < connectionStrings.length; i++) {
    success = await testConnection(connectionStrings[i], i);
    if (success) {
      console.log('\n✅ Found working connection string!');
      console.log('Use this in your environment:');
      console.log('MONGODB_URI=' + connectionStrings[i]);
      break;
    }
  }
  
  if (!success) {
    console.log('\n❌ All connection attempts failed.');
    console.log('\nPossible issues:');
    console.log('1. Check if the cluster name is correct');
    console.log('2. Verify username and password');
    console.log('3. Check IP whitelist in MongoDB Atlas');
    console.log('4. Ensure cluster is active and not paused');
  }
  
  process.exit(success ? 0 : 1);
}

main();
