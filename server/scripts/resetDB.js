// Reset Database Script
// Run: node server/scripts/resetDB.js

require('dotenv').config({ path: __dirname + '/../.env' });
const bcrypt = require('bcrypt');
const { sequelize, User, Server, Channel } = require('../models');
const logger = require('../utils/logger');

async function resetDatabase() {
  try {
    logger.info('Starting database reset...');
    
    // Force recreate all tables
    await sequelize.sync({ force: true });
    logger.info('✅ Database tables recreated');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin509', 10);
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@saudicord.com',
      displayName: 'Administrator',
      password: hashedPassword,
      status: 'offline',
      avatar: null,
      bio: 'System Administrator - Made With Love By SirAbody',
      lastSeen: new Date()
    });
    logger.info('✅ Admin user created');
    
    // Create regular user (Liongtas)
    const lionPassword = await bcrypt.hash('Lion509', 10);
    const lionUser = await User.create({
      username: 'Liongtas',
      email: 'liongtas@saudicord.com',
      displayName: 'Lion',
      password: lionPassword,
      status: 'offline',
      avatar: null,
      bio: 'SaudiCord Member',
      lastSeen: new Date()
    });
    logger.info('✅ Regular user Liongtas created');
    
    // Create default server
    const defaultServer = await Server.create({
      name: 'SaudiCord Community',
      description: 'Welcome to SaudiCord - Made With Love By SirAbody',
      icon: null,
      ownerId: adminUser.id,
      inviteCode: 'saudi2025',
      isPublic: true,
      memberCount: 1
    });
    logger.info('✅ Default server created');
    
    // Create default channels
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
    
    logger.info('✅ Default channels created');
    
    // Add users to server
    await defaultServer.addMember(adminUser);
    await defaultServer.addMember(lionUser);
    await defaultServer.update({ memberCount: 2 });
    logger.info('✅ Users added to default server');
    
    console.log('\n========================================');
    console.log('✅ Database Reset Complete!');
    console.log('========================================');
    console.log('Admin User:');
    console.log('  Username: admin');
    console.log('  Password: admin509');
    console.log('');
    console.log('Regular User:');
    console.log('  Username: Liongtas');
    console.log('  Password: Lion509');
    console.log('');
    console.log('Default Server:');
    console.log('  Name: SaudiCord Community');
    console.log('  Invite Code: saudi2025');
    console.log('========================================');
    console.log('Made With Love By SirAbody');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to reset database:', error);
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  }
}

resetDatabase();
