const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    altText: String
  }],
  caption: {
    type: String,
    maxlength: 2200,
    default: ''
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
  tags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Privacy settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  // Post type
  type: {
    type: String,
    enum: ['image', 'video', 'carousel'],
    default: 'image'
  },
  // Video specific fields
  video: {
    url: String,
    thumbnail: String,
    duration: Number
  },
  // Engagement metrics
  viewCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  // Post status
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
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
  // SEO and discovery
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Analytics
  impressions: {
    type: Number,
    default: 0
  },
  reach: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' });
postSchema.index({ caption: 'text', hashtags: 'text' });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for save count
postSchema.virtual('saveCount').get(function() {
  return this.savedBy.length;
});

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

// Method to check if user has liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to check if user has saved the post
postSchema.methods.isSavedBy = function(userId) {
  return this.savedBy.includes(userId);
};

// Method to add like
postSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ user: userId });
  }
  return this.save();
};

// Method to remove like
postSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Method to add save
postSchema.methods.addSave = function(userId) {
  if (!this.isSavedBy(userId)) {
    this.savedBy.push(userId);
  }
  return this.save();
};

// Method to remove save
postSchema.methods.removeSave = function(userId) {
  this.savedBy = this.savedBy.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Method to add comment
postSchema.methods.addComment = function(commentId) {
  this.comments.push(commentId);
  return this.save();
};

// Method to remove comment
postSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(id => id.toString() !== commentId.toString());
  return this.save();
};

// Method to increment view count
postSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// Pre-save middleware to extract hashtags from caption
postSchema.pre('save', function(next) {
  if (this.isModified('caption')) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    this.hashtags = this.caption.match(hashtagRegex) || [];
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);