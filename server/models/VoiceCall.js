// Voice Call Model
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VoiceCall = sequelize.define('VoiceCall', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  callerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  channelId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'channels',
      key: 'id'
    }
  },
  callType: {
    type: DataTypes.ENUM('voice', 'video', 'screen'),
    defaultValue: 'voice'
  },
  status: {
    type: DataTypes.ENUM('initiated', 'ringing', 'connected', 'ended', 'missed', 'rejected'),
    defaultValue: 'initiated'
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Duration in seconds'
  }
}, {
  tableName: 'voice_calls',
  timestamps: true,
  indexes: [
    {
      fields: ['callerId', 'receiverId']
    },
    {
      fields: ['startedAt']
    }
  ]
});

module.exports = VoiceCall;
