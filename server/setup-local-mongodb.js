// Setup Local MongoDB for Testing
// Made With Love By SirAbody

const mongoose = require('mongoose');
const User = require('./schemas/User');
const Server = require('./schemas/Server');
const Channel = require('./schemas/Channel');
const Role = require('./schemas/Role');

const LOCAL_URI = 'mongodb://localhost:27017/saudicord';

async function setupLocalDB() {
  try {
    console.log('===========================================');
    console.log('🚀 Setting up Local MongoDB for Testing');
    console.log('===========================================\n');
    
    console.log('📝 Make sure MongoDB is installed locally:');
    console.log('   Windows: https://www.mongodb.com/try/download/community');
    console.log('   Mac: brew install mongodb-community');
    console.log('   Linux: apt-get install mongodb\n');
    
    console.log('⏳ Connecting to local MongoDB...');
    await mongoose.connect(LOCAL_URI);
    console.log('✅ Connected to local MongoDB!\n');
    
    // Drop existing data
    console.log('🗑️ Cleaning existing data...');
    await mongoose.connection.dropDatabase();
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = new User({
      username: 'admin',
      email: 'admin@saudicord.com',
      password: 'admin509',
      displayName: 'Administrator',
      bio: 'SaudiCord Administrator',
      isAdmin: true,
      isVerified: true
    });
    await admin.save();
    console.log('   ✅ Username: admin');
    console.log('   ✅ Password: admin509');
    
    // Create test user
    console.log('\n👤 Creating test user...');
    const testUser = new User({
      username: 'liongtas',
      email: 'liongtas@saudicord.com',
      password: 'Lion509',
      displayName: 'Lion',
      bio: 'SaudiCord Member',
      isAdmin: false
    });
    await testUser.save();
    console.log('   ✅ Username: liongtas');
    console.log('   ✅ Password: Lion509');
    
    // Create community server
    console.log('\n🏠 Creating community server...');
    const communityServer = new Server({
      name: 'SaudiCord Community',
      description: 'The official SaudiCord community server',
      owner: admin._id,
      isPublic: true
    });
    
    // Generate invite code
    communityServer.generateInviteCode();
    console.log('   ✅ Server: SaudiCord Community');
    console.log('   ✅ Invite Code:', communityServer.inviteCode);
    
    // Add members
    await communityServer.addMember(admin._id);
    await communityServer.addMember(testUser._id);
    await communityServer.save();
    
    // Create channels
    console.log('\n📝 Creating channels...');
    const generalChannel = new Channel({
      name: 'general',
      type: 'text',
      description: 'General discussion',
      server: communityServer._id,
      position: 0
    });
    await generalChannel.save();
    console.log('   ✅ #general');
    
    const voiceChannel = new Channel({
      name: 'voice-chat',
      type: 'voice',
      description: 'Voice communication',
      server: communityServer._id,
      position: 1
    });
    await voiceChannel.save();
    console.log('   ✅ 🔊 voice-chat');
    
    // Update server with channels
    communityServer.channels.push(generalChannel._id, voiceChannel._id);
    communityServer.settings.defaultChannel = generalChannel._id;
    await communityServer.save();
    
    // Create roles
    console.log('\n👑 Creating roles...');
    const everyoneRole = await Role.createDefaultRole(communityServer._id);
    const adminRole = await Role.createAdminRole(communityServer._id);
    console.log('   ✅ @everyone');
    console.log('   ✅ @admin');
    
    communityServer.roles.push(everyoneRole._id, adminRole._id);
    await communityServer.save();
    
    // Update users with server
    await User.findByIdAndUpdate(admin._id, {
      $addToSet: { servers: communityServer._id }
    });
    
    await User.findByIdAndUpdate(testUser._id, {
      $addToSet: { servers: communityServer._id }
    });
    
    console.log('\n===========================================');
    console.log('✅ Local MongoDB setup complete!');
    console.log('===========================================\n');
    
    console.log('🚀 To run locally:');
    console.log('─────────────────────────────────────');
    console.log('1. cd server');
    console.log('2. node server-mongodb.js');
    console.log('─────────────────────────────────────\n');
    
    console.log('🌐 To use MongoDB Atlas instead:');
    console.log('─────────────────────────────────────');
    console.log('1. Run: node verify-mongodb.js');
    console.log('2. Follow the instructions');
    console.log('─────────────────────────────────────\n');
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n📝 MongoDB is not running locally!');
      console.log('Please install and start MongoDB:');
      console.log('   Windows: net start MongoDB');
      console.log('   Mac/Linux: mongod');
    }
    
    process.exit(1);
  }
}

setupLocalDB();
