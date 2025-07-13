const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const { auth, canAccessPrivateContent } = require('../middleware/auth');
const { uploadProfilePicture, validateProfilePicture, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { isActive: true },
        { isDeleted: { $ne: true } },
        {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex }
          ]
        }
      ]
    })
    .select('username fullName profilePicture isPrivate isVerified followerCount')
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ followerCount: -1, username: 1 });

    const total = await User.countDocuments({
      $and: [
        { _id: { $ne: req.user._id } },
        { isActive: true },
        { isDeleted: { $ne: true } },
        {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex }
          ]
        }
      ]
    });

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/suggestions
// @desc    Get user suggestions
// @access  Private
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users that the current user doesn't follow
    const currentUser = await User.findById(req.user._id).populate('following');
    const followingIds = currentUser.following.map(user => user._id);

    const suggestions = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { _id: { $nin: followingIds } },
        { isActive: true },
        { isDeleted: { $ne: true } },
        { isPrivate: false }
      ]
    })
    .select('username fullName profilePicture isVerified followerCount')
    .limit(parseInt(limit))
    .sort({ followerCount: -1, createdAt: -1 });

    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:username
// @desc    Get user profile by username
// @access  Private
router.get('/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    const { includePosts = 'false' } = req.query;

    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true,
      isDeleted: { $ne: true }
    }).select('-password -emailVerificationToken -passwordResetToken -twoFactorSecret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user can access private content
    if (user.isPrivate && user._id.toString() !== req.user._id.toString()) {
      const isFollowing = user.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This account is private' });
      }
    }

    let posts = [];
    if (includePosts === 'true') {
      // Get user's posts
      const postQuery = { 
        user: user._id,
        isDeleted: { $ne: true }
      };

      // If user is private and current user is not the owner, only show posts to followers
      if (user.isPrivate && user._id.toString() !== req.user._id.toString()) {
        const isFollowing = user.followers.includes(req.user._id);
        if (!isFollowing) {
          return res.status(403).json({ message: 'This account is private' });
        }
      }

      posts = await Post.find(postQuery)
        .populate('user', 'username fullName profilePicture isVerified')
        .sort({ createdAt: -1 })
        .limit(12);
    }

    // Check if current user follows this user
    const isFollowing = user.followers.includes(req.user._id);
    const isFollowedBy = user.following.includes(req.user._id);

    const userResponse = {
      ...user.toObject(),
      isFollowing,
      isFollowedBy,
      posts: includePosts === 'true' ? posts : undefined
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, uploadProfilePicture, validateProfilePicture, async (req, res) => {
  try {
    const { fullName, bio, website, phone, gender } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (phone !== undefined) updateData.phone = phone;
    if (gender) updateData.gender = gender;

    // Handle profile picture upload
    if (req.file) {
      updateData.profilePicture = getFileUrl(req.file.filename, 'profiles');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/privacy
// @desc    Update privacy settings
// @access  Private
router.put('/privacy', auth, async (req, res) => {
  try {
    const { 
      isPrivate, 
      showActivityStatus, 
      allowCommentsFrom, 
      allowMessagesFrom, 
      showPostsInExplore 
    } = req.body;

    const updateData = {};

    if (typeof isPrivate === 'boolean') updateData.isPrivate = isPrivate;
    if (typeof showActivityStatus === 'boolean') updateData['privacySettings.showActivityStatus'] = showActivityStatus;
    if (allowCommentsFrom) updateData['privacySettings.allowCommentsFrom'] = allowCommentsFrom;
    if (allowMessagesFrom) updateData['privacySettings.allowMessagesFrom'] = allowMessagesFrom;
    if (typeof showPostsInExplore === 'boolean') updateData['privacySettings.showPostsInExplore'] = showPostsInExplore;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Privacy settings updated successfully',
      user
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/:userId/follow
// @desc    Follow a user
// @access  Private
router.post('/:userId/follow', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (currentUser._id.toString() === userId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow || !userToFollow.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Add to following
    currentUser.following.push(userId);
    await currentUser.save();

    // Add to user's followers
    userToFollow.followers.push(currentUser._id);
    await userToFollow.save();

    // TODO: Create notification for follow

    res.json({ 
      message: 'User followed successfully',
      isFollowing: true
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:userId/follow
// @desc    Unfollow a user
// @access  Private
router.delete('/:userId/follow', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (currentUser._id.toString() === userId) {
      return res.status(400).json({ message: 'Cannot unfollow yourself' });
    }

    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({ message: 'Not following this user' });
    }

    // Remove from following
    currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
    await currentUser.save();

    // Remove from user's followers
    userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== currentUser._id.toString());
    await userToUnfollow.save();

    res.json({ 
      message: 'User unfollowed successfully',
      isFollowing: false
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId/followers
// @desc    Get user's followers
// @access  Private
router.get('/:userId/followers', auth, canAccessPrivateContent, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followers = await User.find({
      _id: { $in: user.followers },
      isActive: true,
      isDeleted: { $ne: true }
    })
    .select('username fullName profilePicture isVerified isPrivate')
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ username: 1 });

    const total = user.followers.length;

    res.json({
      followers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + followers.length < total
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId/following
// @desc    Get users that a user is following
// @access  Private
router.get('/:userId/following', auth, canAccessPrivateContent, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const following = await User.find({
      _id: { $in: user.following },
      isActive: true,
      isDeleted: { $ne: true }
    })
    .select('username fullName profilePicture isVerified isPrivate')
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ username: 1 });

    const total = user.following.length;

    res.json({
      following,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + following.length < total
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/:userId/block
// @desc    Block a user
// @access  Private
router.post('/:userId/block', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (currentUser._id.toString() === userId) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock || !userToBlock.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already blocked
    if (currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    // Add to blocked users
    currentUser.blockedUsers.push(userId);
    
    // Remove from following/followers if exists
    currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
    currentUser.followers = currentUser.followers.filter(id => id.toString() !== userId);
    
    await currentUser.save();

    // Remove current user from blocked user's following/followers
    userToBlock.following = userToBlock.following.filter(id => id.toString() !== currentUser._id.toString());
    userToBlock.followers = userToBlock.followers.filter(id => id.toString() !== currentUser._id.toString());
    await userToBlock.save();

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:userId/block
// @desc    Unblock a user
// @access  Private
router.delete('/:userId/block', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (currentUser._id.toString() === userId) {
      return res.status(400).json({ message: 'Cannot unblock yourself' });
    }

    const userToUnblock = await User.findById(userId);
    if (!userToUnblock) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if blocked
    if (!currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is not blocked' });
    }

    // Remove from blocked users
    currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userId);
    await currentUser.save();

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId/posts
// @desc    Get user's posts
// @access  Private
router.get('/:userId/posts', auth, canAccessPrivateContent, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 12, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await Post.find({
      user: userId,
      isDeleted: { $ne: true }
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Post.countDocuments({
      user: userId,
      isDeleted: { $ne: true }
    });

    res.json({
      posts,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;