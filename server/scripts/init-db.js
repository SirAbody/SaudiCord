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
    const ventaPassword = await bcrypt.hash('venta509', 8);
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
    const lionPassword2 = await bcrypt.hash('lion509', 8);
    const lionUser2 = await User.create({
      username: 'lion',
      email: 'lion@saudicord.com',
      password: lionPassword2,
      displayName: 'Lion',
      bio: 'SaudiCord Member',
      isAdmin: false
    });
    console.log('[INFO] ✅ User lion created');
    
    // Create default server
    const defaultServer = await Server.create({
      name: 'SaudiCord Community',
      description: 'Welcome to SaudiCord - Made With Love By SirAbody',
      icon: null,
      ownerId: adminUser.id,
      inviteCode: 'saudi2025',
      isPublic: true,
      memberCount: 5 // Updated for all users
    });
    console.log('✅ Default server created');
    
    // Create default channels
    const generalChannel = await Channel.create({
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
    console.log('✅ Default channels created');
    
    // Add users as members to server
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: adminUser.id,
      role: 'admin',
      nickname: null,
      joinedAt: new Date()
    });
    
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: lionUser.id,
      role: 'member',
      nickname: null,
      joinedAt: new Date()
    });
    
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: sirAbodyUser.id,
      role: 'admin',
      nickname: null,
      joinedAt: new Date()
    });
    
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: ventaUser.id,
      role: 'member',
      nickname: null,
      joinedAt: new Date()
    });
    
    await ServerMember.create({
      serverId: defaultServer.id,
      userId: lionUser2.id,
      role: 'member',
      nickname: null,
      joinedAt: new Date()
    });
    console.log('✅ All users added to server as members');
    
    // Create welcome message
    await Message.create({
      content: '🎉 Welcome to SaudiCord Community! This server was made with love by SirAbody. Feel free to chat and have fun!',
      userId: adminUser.id,
      serverId: defaultServer.id
    });
    console.log('✅ Welcome message created');
    
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
