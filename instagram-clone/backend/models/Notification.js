const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'like_post',
      'like_comment',
      'comment_post',
      'comment_reply',
      'follow_user',
      'follow_request',
      'follow_request_accepted',
      'mention_post',
      'mention_comment',
      'mention_story',
      'story_reply',
      'story_mention',
      'post_shared',
      'account_suggested',
      'live_started',
      'live_ended',
      'birthday',
      'anniversary',
      'system_message',
      'security_alert',
      'verification_required',
      'account_restricted',
      'content_removed',
      'appeal_approved',
      'appeal_rejected'
    ],
    required: true
  },
  // Reference to the related content
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  // Additional data for specific notification types
  data: {
    // For follow requests
    followRequestId: String,
    // For mentions
    mentionedIn: {
      type: String,
      enum: ['post', 'comment', 'story', 'caption']
    },
    // For content moderation
    reason: String,
    appealId: String,
    // For system messages
    systemMessage: String,
    // For security alerts
    securityAlert: {
      type: String,
      enum: ['login_attempt', 'password_change', 'email_change', 'suspicious_activity']
    },
    // For live streams
    liveStreamId: String,
    // For birthdays/anniversaries
    eventDate: Date,
    // For account suggestions
    suggestionReason: String
  },
  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  body: {
    type: String,
    required: true,
    maxlength: 500
  },
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isSeen: {
    type: Boolean,
    default: false
  },
  seenAt: Date,
  // Notification priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Notification delivery
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  deliveryMethod: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    default: 'in_app'
  }],
  // Notification grouping
  groupId: String, // For grouping similar notifications
  groupCount: {
    type: Number,
    default: 1
  },
  // Notification expiration
  expiresAt: Date,
  // Notification actions
  actions: [{
    type: {
      type: String,
      enum: ['follow', 'unfollow', 'like', 'comment', 'share', 'save', 'block', 'report', 'appeal']
    },
    label: String,
    url: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'POST'
    }
  }],
  // Notification metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system'],
      default: 'web'
    },
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      city: String,
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
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isSeen: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ groupId: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for notification age in human readable format
notificationSchema.virtual('ageText').get(function() {
  const age = this.age;
  const minutes = Math.floor(age / (1000 * 60));
  const hours = Math.floor(age / (1000 * 60 * 60));
  const days = Math.floor(age / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Method to mark as seen
notificationSchema.methods.markAsSeen = function() {
  if (!this.isSeen) {
    this.isSeen = true;
    this.seenAt = new Date();
  }
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = function(method = 'in_app') {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
  }
  if (!this.deliveryMethod.includes(method)) {
    this.deliveryMethod.push(method);
  }
  return this.save();
};

// Method to increment group count
notificationSchema.methods.incrementGroupCount = function() {
  this.groupCount += 1;
  return this.save();
};

// Method to check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to add action
notificationSchema.methods.addAction = function(action) {
  this.actions.push(action);
  return this.save();
};

// Method to remove action
notificationSchema.methods.removeAction = function(actionType) {
  this.actions = this.actions.filter(action => action.type !== actionType);
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = function(data) {
  const notification = new this(data);
  
  // Set expiration for certain notification types
  if (['like_post', 'like_comment', 'comment_post', 'comment_reply'].includes(data.type)) {
    notification.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  // Set priority for certain notification types
  if (['security_alert', 'verification_required', 'account_restricted'].includes(data.type)) {
    notification.priority = 'urgent';
  } else if (['follow_request', 'live_started'].includes(data.type)) {
    notification.priority = 'high';
  }
  
  return notification.save();
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to mark all notifications as seen for a user
notificationSchema.statics.markAllAsSeen = function(userId) {
  return this.updateMany(
    { recipient: userId, isSeen: false },
    { isSeen: true, seenAt: new Date() }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Pre-save middleware to set default values
notificationSchema.pre('save', function(next) {
  // Set default expiration for notifications that don't have one
  if (!this.expiresAt && !['security_alert', 'verification_required'].includes(this.type)) {
    this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default
  }
  
  // Set default delivery method if not specified
  if (!this.deliveryMethod || this.deliveryMethod.length === 0) {
    this.deliveryMethod = ['in_app'];
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);