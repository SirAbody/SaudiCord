// Quick MongoDB Test
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.mongodb.net/saudicord?retryWrites=true&w=majority';

async function quickTest() {
  console.log('🔄 Testing MongoDB Atlas Connection...\n');
  
  try {
    // Connect
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas!\n');
    
    // Get database info
    const db = mongoose.connection.db;
    const admin = db.admin();
    
    // Check server status
    const serverStatus = await admin.serverStatus();
    console.log('📊 Server Info:');
    console.log('   Version:', serverStatus.version);
    console.log('   Host:', serverStatus.host);
    console.log('   Uptime:', Math.round(serverStatus.uptime / 3600), 'hours\n');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections Found:', collections.length);
    
    if (collections.length > 0) {
      console.log('\n📋 Your Collections:');
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}: ${count} documents`);
      }
    } else {
      console.log('   (No collections yet - will be created when you add data)');
    }
    
    // Check for users
    const User = require('./schemas/User');
    const userCount = await User.countDocuments();
    console.log('\n👥 Users in database:', userCount);
    
    if (userCount > 0) {
      const users = await User.find().select('username email isAdmin');
      console.log('\n📝 Registered Users:');
      users.forEach(u => {
        console.log(`   - ${u.username} (${u.email}) ${u.isAdmin ? '[Admin]' : ''}`);
      });
    }
    
    console.log('\n========================================');
    console.log('🎉 Everything is working perfectly!');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your internet connection');
    console.log('2. Make sure MongoDB Atlas cluster is running');
    console.log('3. Verify username/password are correct');
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
  }
}

// Run test
quickTest();
