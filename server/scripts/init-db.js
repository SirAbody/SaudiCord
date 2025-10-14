// Initialize Database with Default Data
// Made With Love By SirAbody

const bcrypt = require('bcrypt');

async function initializeDatabase() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '../.env' });
    
    console.log('Initializing database...');
    
    // Initialize database
    const sequelize = require('../config/database');
    const { User, Server, Channel, ServerMember, Message } = require('../models');
    
    // Test connection
    console.log('✅ Database connection established');
    
    // Sync all models (force: true will drop existing tables)
    await sequelize.sync({ force: true });
    console.log('✅ Database synced successfully');
    
    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 8);
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@saudicord.com',
      password: adminPassword,
      displayName: 'Administrator',
      bio: 'SaudiCord Administrator',
      isAdmin: true
    });
    console.log('[INFO] ✅ Default admin user created');
    
    // Create test user liongtas
    const lionPassword = await bcrypt.hash('Lion509', 8);
    const lionUser = await User.create({
      username: 'liongtas',
      email: 'liongtas@saudicord.com',
      password: lionPassword,
      displayName: 'Lion',
      bio: 'SaudiCord Member',
      isAdmin: false
    });
    console.log('[INFO] ✅ Test user liongtas created');
    
    // Create SirAbody admin user
    const sirAbodyPassword = await bcrypt.hash('admin123', 8);
    const sirAbodyUser = await User.create({
      username: 'SirAbody',
      email: 'sirabody@saudicord.com',
      password: sirAbodyPassword,
      displayName: 'SirAbody',
      bio: 'Made With Love By SirAbody',
      isAdmin: true
    });
    console.log('[INFO] ✅ SirAbody admin user created');
    
    // Create venta user
    const ventaPassword = await bcrypt.hash('venta509', 10);
    const ventaUser = await User.create({
      username: 'venta',
      email: 'venta@saudicord.com',
      password: ventaPassword,
      displayName: 'Venta',
      bio: 'SaudiCord Member',
      isAdmin: false
    });
    console.log('[INFO] ✅ User venta created');
    
    // Create lion user
    const lionPassword2 = await bcrypt.hash('lion509', 10);
    const lionUser2 = await User.create({
      username: 'lion',
      email: 'lion@saudicord.com',
      password: lionPassword2,
      displayName: 'Lion',
      bio: 'SaudiCord Member',
      isAdmin: false
    });
    console.log('[INFO] ✅ User lion created');
    
    // Create default community server (Public server)
    const defaultServer = await Server.create({
      name: 'SaudiCord Community',
      description: 'Welcome to SaudiCord - Made With Love By SirAbody',
      icon: null,
      ownerId: sirAbodyUser.id,
      inviteCode: 'saudi2025',
      isPublic: true,
      memberCount: 2
    });
    console.log('✅ Default community server created');
    
    // Create default channels for community server
    await Channel.create({
      serverId: defaultServer.id,
      name: 'general',
      type: 'text',
      description: 'General discussion channel',
      position: 0,
      isPrivate: false
    });
    
    await Channel.create({
      serverId: defaultServer.id,
      name: 'voice-chat',
      type: 'voice',
      description: 'General voice channel',
      position: 1,
      isPrivate: false
    });
    
    // Only add admins to community server
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: sirAbodyUser.id,
      role: 'admin',
      nickname: null,
      joinedAt: new Date()
    });
    
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: adminUser.id,
      role: 'admin',
      nickname: null,
      joinedAt: new Date()
    });
    
    // Create personal servers for each user
    const ventaServer = await Server.create({
      name: "Venta's Server",
      description: 'Personal server for Venta',
      icon: null,
      ownerId: ventaUser.id,
      inviteCode: 'venta' + Math.random().toString(36).substring(2, 8),
      isPublic: false,
      memberCount: 1
    });
    
    await Channel.create({
      serverId: ventaServer.id,
      name: 'general',
      type: 'text',
      description: 'General discussion',
      position: 0,
      isPrivate: false
    });
    
    await ServerMember.create({
      serverId: ventaServer.id,
      userId: ventaUser.id,
      role: 'owner',
      nickname: null,
      joinedAt: new Date()
    });
    
    // Create Lion's server
    const lionServer = await Server.create({
      name: "Lion's Server",
      description: 'Personal server for Lion',
      icon: null,
      ownerId: lionUser.id,
      inviteCode: 'lion' + Math.random().toString(36).substring(2, 8),
      isPublic: false,
      memberCount: 1
    });
    
    await Channel.create({
      serverId: lionServer.id,
      name: 'general',
      type: 'text',
      description: 'General discussion',
      position: 0,
      isPrivate: false
    });
    
    await ServerMember.create({
      serverId: lionServer.id,
      userId: lionUser.id,
      role: 'owner',
      nickname: null,
      joinedAt: new Date()
    });
    
    console.log('✅ Personal servers created for users');
    
    // Create welcome message in community server
    const generalChannel = await Channel.findOne({
      where: { serverId: defaultServer.id, name: 'general' }
    });
    
    if (generalChannel) {
      await Message.create({
        content: 'Welcome to SaudiCord! 🎉 Made with Love by SirAbody',
        channelId: generalChannel.id,
        userId: sirAbodyUser.id,
        serverId: defaultServer.id
      });
      console.log('✅ Welcome message created');
    }
    
    console.log('\n========================================');
    console.log('✅ Database initialized successfully!');
    console.log('========================================');
    console.log('\n📝 Default Users:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   User:  username=liongtas, password=Lion509');
    console.log('   Admin: username=SirAbody, password=admin123');
    console.log('   User:  username=venta, password=venta509');
    console.log('   User:  username=lion, password=lion509');
    console.log('\n🚀 You can now start the server and login!');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
