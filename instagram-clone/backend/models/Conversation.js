const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // For group conversations
  isGroup: {
    type: Boolean,
    default: false
  },
  groupInfo: {
    name: {
      type: String,
      maxlength: 50,
      trim: true
    },
    description: {
      type: String,
      maxlength: 200,
      trim: true
    },
    avatar: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    maxParticipants: {
      type: Number,
      default: 50
    }
  },
  // Last message info for conversation list
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  // Unread message counts for each participant
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Conversation settings
  settings: {
    // Individual settings for each participant
    participantSettings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isMuted: {
        type: Boolean,
        default: false
      },
      isPinned: {
        type: Boolean,
        default: false
      },
      isArchived: {
        type: Boolean,
        default: false
      },
      notificationSettings: {
        sound: {
          type: Boolean,
          default: true
        },
        vibration: {
          type: Boolean,
          default: true
        },
        showPreview: {
          type: Boolean,
          default: true
        }
      }
    }],
    // Group settings
    groupSettings: {
      onlyAdminsCanSendMessages: {
        type: Boolean,
        default: false
      },
      onlyAdminsCanEditInfo: {
        type: Boolean,
        default: false
      },
      onlyAdminsCanAddParticipants: {
        type: Boolean,
        default: false
      },
      allowParticipantsToLeave: {
        type: Boolean,
        default: true
      }
    }
  },
  // Conversation status
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Conversation metadata
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalMedia: {
      type: Number,
      default: 0
    },
    createdFrom: {
      type: String,
      enum: ['direct', 'post_comment', 'story_reply', 'profile'],
      default: 'direct'
    },
    sourcePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    sourceStory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    }
  },
  // Conversation encryption (for future implementation)
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionKey: String,
  // Conversation archiving
  archivedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isGroup: 1 });
conversationSchema.index({ 'unreadCounts.user': 1 });

// Virtual for participant count
conversationSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for unread message count for a specific user
conversationSchema.virtual('getUnreadCount').get(function() {
  return function(userId) {
    const unreadData = this.unreadCounts.find(data => 
      data.user.toString() === userId.toString()
    );
    return unreadData ? unreadData.count : 0;
  };
});

// Ensure virtual fields are serialized
conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

// Method to add participant
conversationSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    this.unreadCounts.push({
      user: userId,
      count: 0,
      lastReadAt: new Date()
    });
    this.settings.participantSettings.push({
      user: userId,
      isMuted: false,
      isPinned: false,
      isArchived: false,
      notificationSettings: {
        sound: true,
        vibration: true,
        showPreview: true
      }
    });
  }
  return this.save();
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(id => id.toString() !== userId.toString());
  this.unreadCounts = this.unreadCounts.filter(data => data.user.toString() !== userId.toString());
  this.settings.participantSettings = this.settings.participantSettings.filter(
    setting => setting.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to update last message
conversationSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  this.metadata.totalMessages += 1;
  return this.save();
};

// Method to increment unread count for a user
conversationSchema.methods.incrementUnreadCount = function(userId) {
  const unreadData = this.unreadCounts.find(data => 
    data.user.toString() === userId.toString()
  );
  if (unreadData) {
    unreadData.count += 1;
  }
  return this.save();
};

// Method to mark messages as read for a user
conversationSchema.methods.markAsRead = function(userId) {
  const unreadData = this.unreadCounts.find(data => 
    data.user.toString() === userId.toString()
  );
  if (unreadData) {
    unreadData.count = 0;
    unreadData.lastReadAt = new Date();
  }
  return this.save();
};

// Method to mute conversation for a user
conversationSchema.methods.muteForUser = function(userId) {
  const setting = this.settings.participantSettings.find(s => 
    s.user.toString() === userId.toString()
  );
  if (setting) {
    setting.isMuted = true;
  }
  return this.save();
};

// Method to unmute conversation for a user
conversationSchema.methods.unmuteForUser = function(userId) {
  const setting = this.settings.participantSettings.find(s => 
    s.user.toString() === userId.toString()
  );
  if (setting) {
    setting.isMuted = false;
  }
  return this.save();
};

// Method to pin conversation for a user
conversationSchema.methods.pinForUser = function(userId) {
  const setting = this.settings.participantSettings.find(s => 
    s.user.toString() === userId.toString()
  );
  if (setting) {
    setting.isPinned = true;
  }
  return this.save();
};

// Method to unpin conversation for a user
conversationSchema.methods.unpinForUser = function(userId) {
  const setting = this.settings.participantSettings.find(s => 
    s.user.toString() === userId.toString()
  );
  if (setting) {
    setting.isPinned = false;
  }
  return this.save();
};

// Method to archive conversation for a user
conversationSchema.methods.archiveForUser = function(userId) {
  const setting = this.settings.participantSettings.find(s => 
    s.user.toString() === userId.toString()
  );
  if (setting) {
    setting.isArchived = true;
  }
  this.archivedBy.push({
    user: userId,
    archivedAt: new Date()
  });
  return this.save();
};

// Method to unarchive conversation for a user
conversationSchema.methods.unarchiveForUser = function(userId) {
  const setting = this.settings.participantSettings.find(s => 
    s.user.toString() === userId.toString()
  );
  if (setting) {
    setting.isArchived = false;
  }
  this.archivedBy = this.archivedBy.filter(archive => 
    archive.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user is admin (for group conversations)
conversationSchema.methods.isAdmin = function(userId) {
  if (!this.isGroup) return false;
  return this.groupInfo.admins.some(admin => admin.toString() === userId.toString());
};

// Method to add admin (for group conversations)
conversationSchema.methods.addAdmin = function(userId) {
  if (this.isGroup && !this.isAdmin(userId)) {
    this.groupInfo.admins.push(userId);
  }
  return this.save();
};

// Method to remove admin (for group conversations)
conversationSchema.methods.removeAdmin = function(userId) {
  if (this.isGroup) {
    this.groupInfo.admins = this.groupInfo.admins.filter(admin => 
      admin.toString() !== userId.toString()
    );
  }
  return this.save();
};

// Method to soft delete conversation
conversationSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  if (!this.deletedBy.includes(userId)) {
    this.deletedBy.push(userId);
  }
  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);