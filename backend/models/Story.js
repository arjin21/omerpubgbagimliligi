const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  media: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  caption: {
    type: String,
    maxlength: 100,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  }
}, {
  timestamps: true
});

// Virtual for view count
storySchema.virtual('viewCount').get(function() {
  return this.views.length;
});

// Index for better query performance
storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });

// Ensure virtual fields are serialized
storySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Story', storySchema);