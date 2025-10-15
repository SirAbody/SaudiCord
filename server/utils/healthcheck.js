// Comprehensive Health Check System
// Made With Love By SirAbody

const { sequelize, User, Server, Channel, Message, Friendship } = require('../models');

class HealthChecker {
  constructor() {
    this.checks = {
      database: false,
      models: false,
      authentication: false,
      socket: false,
      api: false
    };
  }

  // Check database connection
  async checkDatabase() {
    try {
      await sequelize.authenticate();
      this.checks.database = true;
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.checks.database = false;
      return false;
    }
  }

  // Check all models are loaded
  async checkModels() {
    try {
      const models = [User, Server, Channel, Message, Friendship];
      for (const Model of models) {
        if (!Model) {
          throw new Error(`Model ${Model.name} not loaded`);
        }
      }
      this.checks.models = true;
      console.log('✅ All models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Model loading failed:', error.message);
      this.checks.models = false;
      return false;
    }
  }

  // Check if default users exist
  async checkDefaultUsers() {
    try {
      if (!this.checks.database) {
        console.warn('⚠️ Skipping user check - database not connected');
        return false;
      }

      const defaultUsernames = ['admin', 'liongtas', 'SirAbody', 'venta', 'lion'];
      const existingUsers = [];
      
      for (const username of defaultUsernames) {
        const user = await User.findOne({ where: { username } });
        if (user) {
          existingUsers.push(username);
        }
      }

      if (existingUsers.length > 0) {
        console.log(`✅ Found ${existingUsers.length} default users: ${existingUsers.join(', ')}`);
      } else {
        console.warn('⚠️ No default users found - database may need initialization');
      }

      return existingUsers.length > 0;
    } catch (error) {
      console.error('❌ User check failed:', error.message);
      return false;
    }
  }

  // Check server structure
  async checkServerStructure() {
    try {
      if (!this.checks.database) {
        console.warn('⚠️ Skipping server structure check - database not connected');
        return false;
      }

      const servers = await Server.findAll({
        include: [{
          model: Channel,
          as: 'channels'
        }]
      });

      const serverInfo = servers.map(s => ({
        name: s.name,
        owner: s.ownerId,
        channels: s.channels?.length || 0,
        isPublic: s.isPublic
      }));

      console.log(`✅ Found ${servers.length} servers in database`);
      
      if (servers.length > 0) {
        console.log('📊 Server breakdown:');
        serverInfo.forEach(s => {
          console.log(`   - ${s.name}: ${s.channels} channels (${s.isPublic ? 'Public' : 'Private'})`);
        });
      }

      return servers.length > 0;
    } catch (error) {
      console.error('❌ Server structure check failed:', error.message);
      return false;
    }
  }

  // Run all checks
  async runAllChecks() {
    console.log('\n========================================');
    console.log('🏥 Running SaudiCord Health Checks');
    console.log('========================================\n');

    const startTime = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Run checks in sequence
    results.checks.database = await this.checkDatabase();
    
    if (results.checks.database) {
      results.checks.models = await this.checkModels();
      results.checks.defaultUsers = await this.checkDefaultUsers();
      results.checks.serverStructure = await this.checkServerStructure();
    }

    const duration = Date.now() - startTime;

    console.log('\n========================================');
    console.log('📋 Health Check Summary');
    console.log('========================================');
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`🌍 Environment: ${results.environment}`);
    console.log(`📅 Timestamp: ${results.timestamp}`);
    
    const allPassed = Object.values(results.checks).every(check => check);
    
    if (allPassed) {
      console.log('\n✅ ALL CHECKS PASSED - System is healthy!');
    } else {
      console.log('\n⚠️ SOME CHECKS FAILED - Review logs above');
    }
    
    console.log('\n💝 Made With Love By SirAbody');
    console.log('========================================\n');

    return results;
  }
}

// Export singleton instance
module.exports = new HealthChecker();
