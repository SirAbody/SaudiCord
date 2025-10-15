// MongoDB Atlas Verification Script
// Made With Love By SirAbody

const { MongoClient } = require('mongodb');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('===========================================');
console.log('🔍 MongoDB Atlas Connection Verifier');
console.log('===========================================\n');

console.log('📋 Instructions:');
console.log('1. Login to https://cloud.mongodb.com');
console.log('2. Click "Connect" on your cluster');
console.log('3. Choose "Drivers" → Node.js');
console.log('4. Copy the connection string\n');

rl.question('📝 Paste your MongoDB connection string here:\n', async (uri) => {
  if (!uri || uri.trim() === '') {
    console.log('\n❌ No connection string provided');
    rl.close();
    return;
  }

  // Hide password in logs
  const safeUri = uri.replace(/:([^:@]+)@/, ':****@');
  console.log(`\n🔗 Testing: ${safeUri}\n`);

  const client = new MongoClient(uri);

  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected!\n');

    // Get cluster info
    const admin = client.db().admin();
    const serverStatus = await admin.serverStatus();
    console.log('📊 Cluster Information:');
    console.log(`   Host: ${serverStatus.host}`);
    console.log(`   Version: ${serverStatus.version}`);
    console.log(`   Storage Engine: ${serverStatus.storageEngine.name}\n`);

    // List databases
    const dbs = await admin.listDatabases();
    console.log('📁 Databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Extract connection details
    const match = uri.match(/@([^\/]+)\//);
    const cluster = match ? match[1] : 'unknown';
    
    console.log('\n✨ SUCCESS! Your MongoDB Atlas is working!\n');
    console.log('📝 Add this to your Render.com environment variables:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Key: MONGODB_URI`);
    console.log(`Value: ${uri}`);
    console.log('─────────────────────────────────────────────────');
    console.log('\n📝 Or update render.yaml:');
    console.log('─────────────────────────────────────────────────');
    console.log(`      - key: MONGODB_URI`);
    console.log(`        value: ${uri}`);
    console.log('─────────────────────────────────────────────────');

  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('\n🔐 Authentication Issue:');
      console.log('   1. Check username and password');
      console.log('   2. Make sure user exists in Database Access');
      console.log('   3. User needs "Read and write to any database" permission');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 DNS Issue:');
      console.log('   1. Check cluster name is correct');
      console.log('   2. Make sure cluster is not deleted');
      console.log('   3. Verify the connection string format');
    } else if (error.message.includes('timeout')) {
      console.log('\n⏱️ Network Issue:');
      console.log('   1. Check Network Access settings');
      console.log('   2. Add 0.0.0.0/0 to allow from anywhere');
      console.log('   3. Make sure cluster is active (not paused)');
    }
  } finally {
    await client.close();
    rl.close();
  }
});

rl.on('close', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});
