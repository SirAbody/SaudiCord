// Test MongoDB Atlas Connection
// Run this file to verify your MongoDB connection

const { connectDB, testConnection, mongoose } = require('./config/mongodb');

async function runTest() {
  console.log('========================================');
  console.log('   MongoDB Atlas Connection Test');
  console.log('   SaudiCord Database Setup');
  console.log('========================================\n');
  
  try {
    // Test connection
    console.log('[1/4] Attempting to connect to MongoDB Atlas...');
    await connectDB();
    
    console.log('[2/4] Testing connection ping...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Connection test successful!\n');
      
      // Display connection details
      console.log('[3/4] Connection Details:');
      console.log('   Cluster: saudicord');
      console.log('   Database:', mongoose.connection.name);
      console.log('   Host:', mongoose.connection.host);
      console.log('   Port:', mongoose.connection.port);
      console.log('   Status:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
      console.log();
      
      // Test collections
      console.log('[4/4] Available Collections:');
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      if (collections.length > 0) {
        collections.forEach(col => {
          console.log(`   - ${col.name}`);
        });
      } else {
        console.log('   No collections yet (will be created on first use)');
      }
      
      console.log('\n========================================');
      console.log('✅ MongoDB Atlas is ready for SaudiCord!');
      console.log('========================================');
      
    } else {
      console.log('❌ Connection test failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check your internet connection');
    console.error('2. Verify MongoDB Atlas credentials');
    console.error('3. Make sure your IP is whitelisted in MongoDB Atlas');
    console.error('4. Check if the cluster is active');
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nConnection closed');
    process.exit(0);
  }
}

// Run the test
runTest();
