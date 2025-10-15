// Test MongoDB Connection with Direct String
const mongoose = require('mongoose');

async function testConnection() {
  // Direct connection string from MongoDB Atlas - WITH CORRECT PASSWORD
  const uri = 'mongodb+srv://abood3alshrary_db_user:23U4pKSr6zNEnf0C@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord';
  
  console.log('Testing MongoDB Atlas connection...');
  console.log('Cluster: saudicord.sfzfre8.mongodb.net');
  console.log('Database: saudicord\n');
  
  try {
    // Try with mongoose
    console.log('Attempting connection with Mongoose...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    
    console.log('✅ SUCCESS! Connected to MongoDB Atlas!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    console.log('Ready State:', mongoose.connection.readyState);
    
    // Test query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(col => console.log('  -', col.name));
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    console.log('\nYour MongoDB Atlas is working correctly!');
    console.log('The connection string is valid.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🔍 DNS Resolution Issue Detected');
      console.log('Possible solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Try using a different DNS (8.8.8.8 or 1.1.1.1)');
      console.log('3. Verify cluster name is correct: saudicord.sfzfre8');
      console.log('4. Try connecting from a different network');
      
      // Try alternate connection format
      console.log('\n📝 Testing alternate connection format...');
      const altUri = 'mongodb://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord-shard-00-00.sfzfre8.mongodb.net:27017,saudicord-shard-00-01.sfzfre8.mongodb.net:27017,saudicord-shard-00-02.sfzfre8.mongodb.net:27017/saudicord?ssl=true&replicaSet=atlas-14n8yv-shard-0&authSource=admin&retryWrites=true&w=majority';
      
      try {
        await mongoose.connect(altUri, {
          serverSelectionTimeoutMS: 10000
        });
        console.log('✅ Alternate format worked!');
        await mongoose.disconnect();
      } catch (altError) {
        console.log('❌ Alternate format also failed');
      }
    }
  }
  
  process.exit(0);
}

testConnection();
