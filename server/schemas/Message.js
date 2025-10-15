// Message Schema for MongoDB
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 4000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  type: {
    type: String,
    enum: ['default', 'system', 'pin', 'reply'],
    default: 'default'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String,
    width: Number,
    height: Number
  }],
  embeds: [{
    title: String,
    description: String,
    url: String,
    color: Number,
    thumbnail: {
      url: String
    },
    image: {
      url: String
    },
    fields: [{
      name: String,
      value: String,
      inline: Boolean
    }],
    footer: {
      text: String,
      iconUrl: String
    },
    timestamp: Date
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mentionRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  mentionEveryone: {
    type: Boolean,
    default: false
  },
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: {
      type: Number,
      default: 0
    }
  }],
  pinned: {
    type: Boolean,
    default: false
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// Indexes
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ server: 1 });
messageSchema.index({ author: 1 });
messageSchema.index({ deleted: 1 });

// Add reaction
messageSchema.methods.addReaction = async function(emoji, userId) {
  let reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (!reaction) {
    reaction = {
      emoji,
      users: [userId],
      count: 1
    };
    this.reactions.push(reaction);
  } else {
    if (!reaction.users.includes(userId)) {
      reaction.users.push(userId);
      reaction.count++;
    }
  }
  
  await this.save();
};

// Remove reaction
messageSchema.methods.removeReaction = async function(emoji, userId) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    reaction.users = reaction.users.filter(u => u.toString() !== userId.toString());
    reaction.count = reaction.users.length;
    
    if (reaction.count === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
    
    await this.save();
  }
};

// Edit message
messageSchema.methods.edit = async function(newContent) {
  this.content = newContent;
  this.edited = true;
  this.editedAt = new Date();
  await this.save();
};

// Soft delete message
messageSchema.methods.softDelete = async function() {
  this.deleted = true;
  this.deletedAt = new Date();
  this.content = '[Message deleted]';
  await this.save();
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
