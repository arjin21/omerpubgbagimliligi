const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  media: {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    duration: Number // for videos
  },
  caption: {
    type: String,
    maxlength: 200,
    default: ''
  },
  // Story styling and effects
  filters: {
    brightness: { type: Number, default: 0 },
    contrast: { type: Number, default: 0 },
    saturation: { type: Number, default: 0 },
    warmth: { type: Number, default: 0 }
  },
  stickers: [{
    type: String,
    position: {
      x: Number,
      y: Number
    },
    scale: Number,
    rotation: Number
  }],
  text: [{
    content: String,
    position: {
      x: Number,
      y: Number
    },
    fontSize: Number,
    color: String,
    fontFamily: String
  }],
  // Story interactions
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    duration: Number // how long they viewed the story
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      maxlength: 200
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Story settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowReplies: {
    type: Boolean,
    default: true
  },
  // Story status
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation
    }
  },
  // Story highlights (for permanent stories)
  highlight: {
    isHighlight: {
      type: Boolean,
      default: false
    },
    highlightTitle: String,
    highlightCover: String
  },
  // Location tagging
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
  // Mentions
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Hashtags
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Music (for video stories)
  music: {
    title: String,
    artist: String,
    url: String
  },
  // Polls and questions
  poll: {
    question: String,
    options: [String],
    votes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      option: Number,
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  question: {
    text: String,
    answers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      answer: String,
      answeredAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ isActive: 1, expiresAt: 1 });
storySchema.index({ 'highlight.isHighlight': 1 });
storySchema.index({ hashtags: 1 });

// Virtual for view count
storySchema.virtual('viewCount').get(function() {
  return this.views.length;
});

// Virtual for reply count
storySchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Virtual to check if story is expired
storySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Ensure virtual fields are serialized
storySchema.set('toJSON', { virtuals: true });
storySchema.set('toObject', { virtuals: true });

// Method to check if user has viewed the story
storySchema.methods.isViewedBy = function(userId) {
  return this.views.some(view => view.user.toString() === userId.toString());
};

// Method to add view
storySchema.methods.addView = function(userId, duration = 0) {
  if (!this.isViewedBy(userId)) {
    this.views.push({ user: userId, duration });
  }
  return this.save();
};

// Method to add reply
storySchema.methods.addReply = function(userId, text) {
  this.replies.push({ user: userId, text });
  return this.save();
};

// Method to add to highlight
storySchema.methods.addToHighlight = function(title, cover) {
  this.highlight.isHighlight = true;
  this.highlight.highlightTitle = title;
  this.highlight.highlightCover = cover;
  return this.save();
};

// Method to remove from highlight
storySchema.methods.removeFromHighlight = function() {
  this.highlight.isHighlight = false;
  this.highlight.highlightTitle = undefined;
  this.highlight.highlightCover = undefined;
  return this.save();
};

// Method to vote on poll
storySchema.methods.votePoll = function(userId, option) {
  if (this.poll && option < this.poll.options.length) {
    // Remove existing vote if any
    this.poll.votes = this.poll.votes.filter(vote => vote.user.toString() !== userId.toString());
    // Add new vote
    this.poll.votes.push({ user: userId, option });
  }
  return this.save();
};

// Method to answer question
storySchema.methods.answerQuestion = function(userId, answer) {
  if (this.question) {
    // Remove existing answer if any
    this.question.answers = this.question.answers.filter(ans => ans.user.toString() !== userId.toString());
    // Add new answer
    this.question.answers.push({ user: userId, answer });
  }
  return this.save();
};

// Pre-save middleware to extract hashtags and mentions
storySchema.pre('save', function(next) {
  if (this.isModified('caption')) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    this.hashtags = this.caption.match(hashtagRegex) || [];
    
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    const mentions = this.caption.match(mentionRegex) || [];
    // This would need to be populated with actual user IDs in the controller
    this.mentions = mentions;
  }
  next();
});

// Middleware to automatically deactivate expired stories
storySchema.pre('find', function() {
  this.where({ expiresAt: { $gt: new Date() } });
});

module.exports = mongoose.model('Story', storySchema);