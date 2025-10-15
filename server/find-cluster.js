// Find the correct MongoDB cluster
const { MongoClient } = require('mongodb');

// Common MongoDB Atlas cluster patterns
const clusters = [
  'cluster0',
  'cluster0.rj2vx',
  'saudicord',
  'saudicord-cluster',
  'cluster0.vn9lo',
  'cluster0.abcde',
  'cluster0.mongodb'
];

async function testCluster(cluster) {
  const uri = `mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@${cluster}.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri);
  
  try {
    console.log(`Testing cluster: ${cluster}`);
    await client.connect();
    console.log(`✅ SUCCESS! Found working cluster: ${cluster}`);
    console.log(`Full URI: mongodb+srv://abood3alshrary_db_user:****@${cluster}.mongodb.net/saudicord?retryWrites=true&w=majority`);
    
    // Test the database
    const db = client.db('saudicord');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await client.close();
    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message.substring(0, 50)}...`);
    await client.close().catch(() => {});
    return false;
  }
}

async function main() {
  console.log('Searching for MongoDB Atlas cluster...\n');
  
  for (const cluster of clusters) {
    const success = await testCluster(cluster);
    if (success) {
      console.log('\n✨ Found the correct cluster! Update your config files with:');
      console.log(`MONGODB_URI=mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@${cluster}.mongodb.net/saudicord?retryWrites=true&w=majority`);
      process.exit(0);
    }
  }
  
  console.log('\n❌ Could not find the cluster. You need to:');
  console.log('1. Login to MongoDB Atlas (https://cloud.mongodb.com)');
  console.log('2. Find your cluster name');
  console.log('3. Copy the connection string from the "Connect" button');
  process.exit(1);
}

main();
