// Database Models Configuration
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const UserModel = require('./User');
const ChannelModel = require('./Channel');
const MessageModel = require('./Message');
const ServerModel = require('./Server');

// Initialize models
const User = UserModel(sequelize, Sequelize.DataTypes);
const Channel = ChannelModel(sequelize, Sequelize.DataTypes);
const Message = MessageModel(sequelize, Sequelize.DataTypes);
const Server = ServerModel(sequelize, Sequelize.DataTypes);

// Define associations
// Server has many channels
Server.hasMany(Channel, { foreignKey: 'serverId', as: 'channels' });
Channel.belongsTo(Server, { foreignKey: 'serverId', as: 'server' });

// Server has many users (members)
Server.belongsToMany(User, { through: 'ServerMembers', as: 'members' });
User.belongsToMany(Server, { through: 'ServerMembers', as: 'servers' });

// Channel has many messages
Channel.hasMany(Message, { foreignKey: 'channelId', as: 'messages' });
Message.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });

// User has many messages
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// User friends (self-referencing many-to-many)
User.belongsToMany(User, {
  through: 'UserFriends',
  as: 'friends',
  foreignKey: 'userId',
  otherKey: 'friendId'
});

module.exports = {
  sequelize,
  User,
  Channel,
  Message,
  Server
};
