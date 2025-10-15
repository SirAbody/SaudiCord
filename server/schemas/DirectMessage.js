// Direct Message Schema for MongoDB
const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 4000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversation: {
    type: String,
    required: true,
    index: true
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'directmessages'
});

// Indexes
directMessageSchema.index({ sender: 1, receiver: 1 });
directMessageSchema.index({ conversation: 1, createdAt: -1 });
directMessageSchema.index({ receiver: 1, read: 1 });

// Create conversation ID
directMessageSchema.statics.createConversationId = function(userId1, userId2) {
  // Sort IDs to ensure consistent conversation ID
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}-${ids[1]}`;
};

// Mark as read
directMessageSchema.methods.markAsRead = async function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
};

// Get conversation messages
directMessageSchema.statics.getConversation = async function(userId1, userId2, limit = 50, skip = 0) {
  const conversationId = this.createConversationId(userId1, userId2);
  return await this.find({ 
    conversation: conversationId,
    deleted: false
  })
  .populate('sender', 'username displayName avatar status')
  .populate('receiver', 'username displayName avatar status')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Get unread count
directMessageSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    receiver: userId,
    read: false,
    deleted: false
  });
};

// Get conversations list
directMessageSchema.statics.getConversationsList = async function(userId) {
  const pipeline = [
    {
      $match: {
        $and: [
          { $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { receiver: new mongoose.Types.ObjectId(userId) }] },
          { deleted: false }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversation',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
                { $eq: ['$read', false] }
              ]},
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.sender',
        foreignField: '_id',
        as: 'lastMessage.senderInfo'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.receiver',
        foreignField: '_id',
        as: 'lastMessage.receiverInfo'
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);
module.exports = DirectMessage;
