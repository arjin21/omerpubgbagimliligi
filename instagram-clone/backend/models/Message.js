const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact'],
      default: 'text'
    },
    text: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    media: {
      url: String,
      thumbnail: String,
      filename: String,
      size: Number,
      duration: Number // for audio/video
    },
    location: {
      name: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: undefined
        }
      }
    },
    contact: {
      name: String,
      phone: String,
      email: String
    }
  },
  // Message status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  // Message reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // Forwarded message
  forwardedFrom: {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Message editing
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  editHistory: [{
    text: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Message deletion
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Message encryption (for future implementation)
  isEncrypted: {
    type: Boolean,
    default: false
  },
  // Message priority
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Message scheduling
  scheduledFor: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  // Message threading
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  threadMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ scheduledFor: 1 });

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for thread message count
messageSchema.virtual('threadMessageCount').get(function() {
  return this.threadMessages.length;
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Method to mark message as delivered
messageSchema.methods.markAsDelivered = function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
  }
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  // Add new reaction
  this.reactions.push({ user: userId, emoji });
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user has reacted
messageSchema.methods.hasReactionFrom = function(userId) {
  return this.reactions.some(reaction => 
    reaction.user.toString() === userId.toString()
  );
};

// Method to get user's reaction
messageSchema.methods.getUserReaction = function(userId) {
  const reaction = this.reactions.find(reaction => 
    reaction.user.toString() === userId.toString()
  );
  return reaction ? reaction.emoji : null;
};

// Method to edit message
messageSchema.methods.edit = function(newText) {
  if (this.content.type === 'text') {
    // Save current text to edit history
    this.editHistory.push({
      text: this.content.text,
      editedAt: new Date()
    });
    
    this.content.text = newText;
    this.isEdited = true;
    this.editedAt = new Date();
  }
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method to add to thread
messageSchema.methods.addToThread = function(threadId) {
  this.threadId = threadId;
  return this.save();
};

// Method to add thread message
messageSchema.methods.addThreadMessage = function(messageId) {
  this.threadMessages.push(messageId);
  return this.save();
};

// Pre-save middleware to handle scheduled messages
messageSchema.pre('save', function(next) {
  if (this.isScheduled && this.scheduledFor) {
    // If scheduled time has passed, send immediately
    if (new Date() >= this.scheduledFor) {
      this.isScheduled = false;
      this.scheduledFor = undefined;
    }
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);