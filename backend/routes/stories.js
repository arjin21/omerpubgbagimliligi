const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const router = express.Router();

// Create a story
router.post('/', auth, uploadSingle, async (req, res) => {
  try {
    const { caption, location, mentions, isPrivate } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Media file is required' });
    }

    const mediaUrl = `/uploads/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';

    const story = new Story({
      user: req.user._id,
      media: mediaUrl,
      mediaType,
      caption: caption || '',
      location: location || '',
      mentions: mentions ? mentions.split(',').map(mention => mention.trim()) : [],
      isPrivate: isPrivate === 'true'
    });

    await story.save();

    // Populate user info
    await story.populate('user', 'username fullName profilePicture');

    res.status(201).json(story);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stories for feed (from followed users)
router.get('/feed', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    const stories = await Story.find({
      user: { $in: [...currentUser.following, req.user._id] },
      expiresAt: { $gt: new Date() },
      isPrivate: false
    })
    .populate('user', 'username fullName profilePicture')
    .populate('views.user', 'username fullName profilePicture')
    .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get feed stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's stories
router.get('/user/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stories = await Story.find({
      user: user._id,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username fullName profilePicture')
    .populate('views.user', 'username fullName profilePicture')
    .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// View a story
router.post('/:storyId/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story || story.expiresAt < new Date()) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    // Check if already viewed
    const alreadyViewed = story.views.some(view => 
      view.user.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      story.views.push({
        user: req.user._id,
        viewedAt: new Date()
      });
      await story.save();
    }

    res.json({ message: 'Story viewed successfully' });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a story
router.delete('/:storyId', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Story.findByIdAndDelete(req.params.storyId);

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get story views
router.get('/:storyId/views', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('views.user', 'username fullName profilePicture');

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(story.views);
  } catch (error) {
    console.error('Get story views error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;