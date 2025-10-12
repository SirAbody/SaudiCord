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
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync all models (force: true will drop existing tables)
    await sequelize.sync({ force: true });
    console.log('✅ Database synced successfully');
    
    // Create admin user
    const hashedAdminPassword = await bcrypt.hash('admin509', 10);
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@saudicord.com',
      displayName: 'Administrator',
      password: hashedAdminPassword,
      status: 'offline',
      avatar: null,
      bio: 'System Administrator - Made With Love By SirAbody',
      lastSeen: new Date()
    });
    console.log('✅ Admin user created (username: admin, password: admin509)');
    
    // Create regular user (Liongtas)
    const hashedLionPassword = await bcrypt.hash('Lion509', 10);
    const lionUser = await User.create({
      username: 'Liongtas',
      email: 'liongtas@saudicord.com',
      displayName: 'Lion',
      password: hashedLionPassword,
      status: 'offline',
      avatar: null,
      bio: 'SaudiCord Member',
      lastSeen: new Date()
    });
    console.log('✅ Regular user Liongtas created (username: Liongtas, password: Lion509)');
    
    // Create default server
    const defaultServer = await Server.create({
      name: 'SaudiCord Community',
      description: 'Welcome to SaudiCord - Made With Love By SirAbody',
      icon: null,
      ownerId: adminUser.id,
      inviteCode: 'saudi2025',
      isPublic: true,
      memberCount: 2
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
    console.log('✅ Users added to default server');
    
    // Create welcome message
    await Message.create({
      content: '🎉 Welcome to SaudiCord Community! This server was made with love by SirAbody. Feel free to chat and have fun!',
      userId: adminUser.id,
      channelId: generalChannel.id,
      serverId: defaultServer.id
    });
    console.log('✅ Welcome message created');
    
    console.log('\n========================================');
    console.log('✅ Database initialized successfully!');
    console.log('========================================');
    console.log('\n📝 Default Users:');
    console.log('   Admin: username=admin, password=admin509');
    console.log('   User:  username=Liongtas, password=Lion509');
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
