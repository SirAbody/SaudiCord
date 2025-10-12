// Database Models Configuration
const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Initialize models
const User = require('./User')(sequelize, DataTypes);
const Server = require('./Server')(sequelize, DataTypes);
const Channel = require('./Channel')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);
const VoiceCall = require('./VoiceCall')(sequelize, DataTypes);
const Friendship = require('./Friendship')(sequelize, DataTypes);
const DirectMessage = require('./DirectMessage')(sequelize, DataTypes);

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

// Friendship associations
User.hasMany(Friendship, { foreignKey: 'userId', as: 'friendships' });
User.hasMany(Friendship, { foreignKey: 'friendId', as: 'friendRequests' });
Friendship.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friendship.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });
Friendship.belongsTo(User, { foreignKey: 'initiatedBy', as: 'initiator' });

// Direct Message associations
User.hasMany(DirectMessage, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(DirectMessage, { foreignKey: 'receiverId', as: 'receivedMessages' });
DirectMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
DirectMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Voice Call associations
User.hasMany(VoiceCall, { foreignKey: 'callerId', as: 'outgoingCalls' });
User.hasMany(VoiceCall, { foreignKey: 'receiverId', as: 'incomingCalls' });
VoiceCall.belongsTo(User, { foreignKey: 'callerId', as: 'caller' });
VoiceCall.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = {
  sequelize,
  User,
  Server,
  Channel,
  Message,
  VoiceCall,
  Friendship,
  DirectMessage
};
