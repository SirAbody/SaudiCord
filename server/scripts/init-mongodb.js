// MongoDB Initialization Script
// Made With Love By SirAbody

const mongoose = require('mongoose');
const { connectDB } = require('../config/mongodb');

// MongoDB Schemas
const User = require('../schemas/User');
const Server = require('../schemas/Server');
const Channel = require('../schemas/Channel');
const Role = require('../schemas/Role');

async function initializeMongoDB() {
  try {
    console.log('===========================================');
    console.log('📦 Initializing MongoDB Database');
    console.log('===========================================');
    
    // Connect to MongoDB
    await connectDB();
    
    // Check if we should reset the database
    const RESET_DB = process.env.RESET_DB === 'true';
    
    if (RESET_DB) {
      console.log('[MongoDB] 🔄 Resetting database...');
      
      // Drop all collections
      const collections = await mongoose.connection.db.collections();
      for (let collection of collections) {
        await collection.drop();
        console.log(`[MongoDB] Dropped collection: ${collection.collectionName}`);
      }
    }
    
    // Check if admin user exists
    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.log('[MongoDB] Creating admin user...');
      admin = new User({
        username: 'admin',
        email: 'admin@saudicord.com',
        password: 'admin509',
        displayName: 'Administrator',
        bio: 'SaudiCord Administrator',
        isAdmin: true,
        isVerified: true
      });
      await admin.save();
      console.log('[MongoDB] ✅ Admin user created');
    }
    
    // Check if test user exists
    let liongtas = await User.findOne({ username: 'liongtas' });
    if (!liongtas) {
      console.log('[MongoDB] Creating test user...');
      liongtas = new User({
        username: 'liongtas',
        email: 'liongtas@saudicord.com',
        password: 'Lion509',
        displayName: 'Lion',
        bio: 'SaudiCord Member',
        isAdmin: false
      });
      await liongtas.save();
      console.log('[MongoDB] ✅ Test user created');
    }
    
    // Check if community server exists
    let communityServer = await Server.findOne({ name: 'SaudiCord Community' });
    if (!communityServer) {
      console.log('[MongoDB] Creating community server...');
      
      communityServer = new Server({
        name: 'SaudiCord Community',
        description: 'The official SaudiCord community server',
        owner: admin._id,
        isPublic: true
      });
      
      // Generate invite code
      communityServer.generateInviteCode();
      
      // Add members
      await communityServer.addMember(admin._id);
      await communityServer.addMember(liongtas._id);
      await communityServer.save();
      
      // Create default channels
      const generalChannel = new Channel({
        name: 'general',
        type: 'text',
        description: 'General discussion',
        server: communityServer._id,
        position: 0
      });
      await generalChannel.save();
      
      const voiceChannel = new Channel({
        name: 'voice-chat',
        type: 'voice',
        description: 'Voice communication',
        server: communityServer._id,
        position: 1
      });
      await voiceChannel.save();
      
      // Update server with channels
      communityServer.channels.push(generalChannel._id, voiceChannel._id);
      communityServer.settings.defaultChannel = generalChannel._id;
      await communityServer.save();
      
      // Create default roles
      const everyoneRole = await Role.createDefaultRole(communityServer._id);
      const adminRole = await Role.createAdminRole(communityServer._id);
      
      communityServer.roles.push(everyoneRole._id, adminRole._id);
      await communityServer.save();
      
      console.log('[MongoDB] ✅ Community server created');
      console.log('[MongoDB] 🔑 Invite code:', communityServer.inviteCode);
    }
    
    // Add users to their servers list
    await User.findByIdAndUpdate(admin._id, {
      $addToSet: { servers: communityServer._id }
    });
    
    await User.findByIdAndUpdate(liongtas._id, {
      $addToSet: { servers: communityServer._id }
    });
    
    console.log('===========================================');
    console.log('✅ MongoDB initialization complete!');
    console.log('===========================================');
    console.log('Users created:');
    console.log('  - admin / admin509');
    console.log('  - liongtas / Lion509');
    console.log('===========================================');
    
    process.exit(0);
  } catch (error) {
    console.error('[MongoDB] ❌ Initialization error:', error);
    process.exit(1);
  }
}

// Run initialization
initializeMongoDB();
