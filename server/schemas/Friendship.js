// Friendship Schema for MongoDB
const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
    required: true
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  declinedAt: {
    type: Date,
    default: null
  },
  blockedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'friendships'
});

// Indexes
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

// Accept friend request
friendshipSchema.methods.accept = async function() {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  await this.save();
};

// Decline friend request
friendshipSchema.methods.decline = async function() {
  this.status = 'declined';
  this.declinedAt = new Date();
  await this.save();
};

// Block user
friendshipSchema.methods.block = async function(blockerId) {
  this.status = 'blocked';
  this.blockedBy = blockerId;
  this.blockedAt = new Date();
  await this.save();
};

// Get all friends for a user
friendshipSchema.statics.getFriends = async function(userId) {
  return await this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  })
  .populate('requester', 'username displayName avatar status lastSeen')
  .populate('recipient', 'username displayName avatar status lastSeen');
};

// Get pending friend requests
friendshipSchema.statics.getPendingRequests = async function(userId) {
  return await this.find({
    recipient: userId,
    status: 'pending'
  })
  .populate('requester', 'username displayName avatar');
};

// Check if two users are friends
friendshipSchema.statics.areFriends = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { requester: userId1, recipient: userId2, status: 'accepted' },
      { requester: userId2, recipient: userId1, status: 'accepted' }
    ]
  });
  return !!friendship;
};

// Check if blocked
friendshipSchema.statics.isBlocked = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { requester: userId1, recipient: userId2, status: 'blocked' },
      { requester: userId2, recipient: userId1, status: 'blocked' }
    ]
  });
  return !!friendship;
};

const Friendship = mongoose.model('Friendship', friendshipSchema);
module.exports = Friendship;
