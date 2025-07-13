const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Optional auth middleware - doesn't require token but adds user if available
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Admin authorization failed' });
  }
};

// Check if user can access private content
const canAccessPrivateContent = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (currentUser._id.toString() === userId) {
      return next(); // User can access their own content
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!targetUser.isPrivate) {
      return next(); // Public account, can access
    }

    // Check if current user follows the target user
    const isFollowing = targetUser.followers.includes(currentUser._id);
    if (!isFollowing) {
      return res.status(403).json({ message: 'This account is private' });
    }

    next();
  } catch (error) {
    console.error('Can access private content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if user can message another user
const canMessageUser = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUser = req.user;

    if (currentUser._id.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot message yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if recipient has blocked the sender
    if (recipient.blockedUsers.includes(currentUser._id)) {
      return res.status(403).json({ message: 'Cannot send message to this user' });
    }

    // Check if sender has blocked the recipient
    if (currentUser.blockedUsers.includes(recipientId)) {
      return res.status(403).json({ message: 'Cannot send message to this user' });
    }

    // Check privacy settings
    if (recipient.privacySettings.allowMessagesFrom === 'followers') {
      const isFollowing = recipient.followers.includes(currentUser._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This user only accepts messages from followers' });
      }
    }

    next();
  } catch (error) {
    console.error('Can message user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if user can comment on a post
const canCommentOnPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUser = req.user;

    const Post = require('../models/Post');
    const post = await Post.findById(postId).populate('user');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.allowComments) {
      return res.status(403).json({ message: 'Comments are disabled on this post' });
    }

    const postOwner = post.user;
    
    // Check privacy settings
    if (postOwner.privacySettings.allowCommentsFrom === 'followers') {
      const isFollowing = postOwner.followers.includes(currentUser._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'Only followers can comment on this post' });
      }
    } else if (postOwner.privacySettings.allowCommentsFrom === 'following_and_followers') {
      const isFollowing = postOwner.followers.includes(currentUser._id);
      const isFollowedBy = postOwner.following.includes(currentUser._id);
      if (!isFollowing && !isFollowedBy) {
        return res.status(403).json({ message: 'Only followers and following can comment on this post' });
      }
    }

    next();
  } catch (error) {
    console.error('Can comment on post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Rate limiting middleware
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    const recentRequests = userRequests.filter(time => time > windowStart);

    if (recentRequests.length >= max) {
      return res.status(429).json({ message: 'Too many requests, please try again later' });
    }

    recentRequests.push(now);
    requests.set(key, recentRequests);

    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  canAccessPrivateContent,
  canMessageUser,
  canCommentOnPost,
  rateLimit
};