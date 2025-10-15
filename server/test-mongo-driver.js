// Test with pure MongoDB driver
const { MongoClient } = require('mongodb');

// Connection strings to test
const connectionStrings = [
  // SRV format (recommended)
  'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.sfzfre8.mongodb.net/?retryWrites=true&w=majority',
  
  // With database name
  'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority',
  
  // With appName
  'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord'
];

async function testConnection(uri, index) {
  console.log(`\nTest ${index + 1}:`);
  console.log('Testing connection...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test the connection
    await client.db().admin().ping();
    console.log('✅ Ping successful!');
    
    // List databases
    const dbs = await client.db().admin().listDatabases();
    console.log('Databases found:', dbs.databases.length);
    
    await client.close();
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message.substring(0, 100));
    return false;
  }
}

async function main() {
  console.log('===========================================');
  console.log('Testing MongoDB Atlas Connection');
  console.log('Cluster: saudicord.sfzfre8.mongodb.net');
  console.log('===========================================');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnection(connectionStrings[i], i);
    if (success) {
      console.log('\n✅ Found working connection format!');
      console.log('Use connection string', i + 1);
      process.exit(0);
    }
  }
  
  console.log('\n❌ All connection attempts failed');
  console.log('\nTroubleshooting:');
  console.log('1. Verify password is correct: tRW1DvPPDkdhkjrA');
  console.log('2. Check Network Access includes 0.0.0.0/0');
  console.log('3. Ensure cluster is Active (not paused)');
  console.log('4. Try from a different network/VPN');
  process.exit(1);
}

main().catch(console.error);
