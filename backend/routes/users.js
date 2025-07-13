const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username fullName profilePicture')
      .populate('following', 'username fullName profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's posts
    const posts = await Post.find({ 
      user: user._id, 
      isDeleted: false 
    })
    .populate('user', 'username fullName profilePicture')
    .populate('likes', 'username')
    .populate('comments')
    .sort({ createdAt: -1 });

    res.json({
      user,
      posts
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { fullName, bio, website, phone, gender, isPrivate } = req.body;

    const user = await User.findById(req.user._id);
    
    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (website !== undefined) user.website = website;
    if (phone !== undefined) user.phone = phone;
    if (gender !== undefined) user.gender = gender;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile picture
router.put('/profile-picture', auth, async (req, res) => {
  try {
    const { profilePicture } = req.body;

    const user = await User.findById(req.user._id);
    user.profilePicture = profilePicture;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already following
    if (currentUser.following.includes(req.params.userId)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Add to following
    currentUser.following.push(req.params.userId);
    await currentUser.save();

    // Add to followers
    userToFollow.followers.push(req.user._id);
    await userToFollow.save();

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow user
router.post('/unfollow/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const userToUnfollow = await User.findById(req.params.userId);

    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from following
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== req.params.userId
    );
    await currentUser.save();

    // Remove from followers
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== req.user._id.toString()
    );
    await userToUnfollow.save();

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get followers
router.get('/:userId/followers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username fullName profilePicture bio')
      .select('followers');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get following
router.get('/:userId/following', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username fullName profilePicture bio')
      .select('following');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/search/:query', auth, async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id }
    })
    .select('username fullName profilePicture bio')
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get suggested users
router.get('/suggested/users', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    // Get users that the current user is not following
    const suggestedUsers = await User.find({
      _id: { 
        $nin: [...currentUser.following, req.user._id] 
      }
    })
    .select('username fullName profilePicture bio')
    .limit(10);

    res.json(suggestedUsers);
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;