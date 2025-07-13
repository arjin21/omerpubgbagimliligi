const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For nested comments (replies)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  // Mentions in comments
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Comment status
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  // Moderation
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ text: 'text' });

// Virtual for like count
commentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Ensure virtual fields are serialized
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

// Method to check if user has liked the comment
commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add like
commentSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ user: userId });
  }
  return this.save();
};

// Method to remove like
commentSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Method to add reply
commentSchema.methods.addReply = function(replyId) {
  this.replies.push(replyId);
  return this.save();
};

// Method to remove reply
commentSchema.methods.removeReply = function(replyId) {
  this.replies = this.replies.filter(id => id.toString() !== replyId.toString());
  return this.save();
};

// Method to soft delete comment
commentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.text = '[This comment has been deleted]';
  return this.save();
};

// Method to flag comment
commentSchema.methods.flag = function(userId, reason) {
  if (!this.flaggedBy.some(flag => flag.user.toString() === userId.toString())) {
    this.flaggedBy.push({ user: userId, reason });
  }
  return this.save();
};

// Pre-save middleware to extract mentions
commentSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    const mentions = this.text.match(mentionRegex) || [];
    // This would need to be populated with actual user IDs in the controller
    this.mentions = mentions;
  }
  next();
});

module.exports = mongoose.model('Comment', commentSchema);