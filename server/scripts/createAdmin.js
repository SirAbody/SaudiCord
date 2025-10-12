// Script to create admin user
// Run: node server/scripts/createAdmin.js

require('dotenv').config({ path: __dirname + '/../.env' });
const bcrypt = require('bcrypt');
const { User, sequelize } = require('../models');
const logger = require('../utils/logger');

async function createAdminUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (existingAdmin) {
      logger.info('Admin user already exists');
      // Update password if needed
      const hashedPassword = await bcrypt.hash('admin509', 10);
      await existingAdmin.update({ password: hashedPassword });
      logger.info('Admin password updated');
    } else {
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
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info('Admin user created successfully:', {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email
      });
    }
    
    console.log('✅ Admin user ready!');
    console.log('Username: admin');
    console.log('Password: admin509');
    console.log('Made With Love By SirAbody');
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
