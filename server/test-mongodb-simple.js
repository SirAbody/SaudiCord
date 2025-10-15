// Simple MongoDB Connection Test
const { MongoClient } = require('mongodb');

// Your MongoDB Atlas connection string - UPDATED!
const uri = 'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord';

async function run() {
  const client = new MongoClient(uri);
  
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // List databases
    const databasesList = await client.db().admin().listDatabases();
    console.log('\nDatabases:');
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  } finally {
    await client.close();
  }
}

run().catch(console.error);
