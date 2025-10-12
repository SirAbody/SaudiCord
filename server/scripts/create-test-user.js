// Script to create a test user
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: console.log
});

// User model definition
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  status: {
    type: DataTypes.ENUM('online', 'idle', 'dnd', 'offline'),
    defaultValue: 'offline'
  },
  customStatus: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

async function createTestUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Sync models
    await sequelize.sync();
    console.log('✅ Database synced');

    // Create test user
    const hashedPassword = await bcrypt.hash('Lion509', 10);
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: { username: 'liongtas' }
    });

    if (existingUser) {
      console.log('⚠️ User "liongtas" already exists');
      // Update password just in case
      existingUser.password = hashedPassword;
      await existingUser.save();
      console.log('✅ Password updated for user "liongtas"');
    } else {
      // Create new user
      const user = await User.create({
        username: 'liongtas',
        email: 'liongtas@saudicord.com',
        password: hashedPassword,
        displayName: 'Lion',
        bio: 'Test user for SaudiCord',
        isAdmin: true
      });
      console.log('✅ Created test user:');
      console.log('   Username: liongtas');
      console.log('   Password: Lion509');
      console.log('   Email: liongtas@saudicord.com');
      console.log('   Admin: Yes');
    }

    // Also create SirAbody admin user
    const adminUser = await User.findOne({
      where: { username: 'SirAbody' }
    });

    if (!adminUser) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'SirAbody',
        email: 'admin@saudicord.com',
        password: adminPassword,
        displayName: 'SirAbody',
        bio: 'SaudiCord Creator - Made With Love',
        isAdmin: true
      });
      console.log('✅ Created admin user:');
      console.log('   Username: SirAbody');
      console.log('   Password: admin123');
    }

    console.log('\n✅ All test users created successfully!');
    console.log('You can now login with:');
    console.log('- Username: liongtas, Password: Lion509');
    console.log('- Username: SirAbody, Password: admin123');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createTestUser();
