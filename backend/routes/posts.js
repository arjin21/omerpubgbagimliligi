const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const router = express.Router();

// Create a new post
router.post('/', auth, uploadMultiple, async (req, res) => {
  try {
    const { caption, location, tags, mentions, isPrivate } = req.body;
    
    // Get uploaded file URLs (in production, you'd upload to cloud storage)
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    if (images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const post = new Post({
      user: req.user._id,
      images,
      caption: caption || '',
      location: location || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      mentions: mentions ? mentions.split(',').map(mention => mention.trim()) : [],
      isPrivate: isPrivate === 'true'
    });

    await post.save();

    // Populate user info
    await post.populate('user', 'username fullName profilePicture');

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feed posts (posts from followed users)
router.get('/feed', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    
    const posts = await Post.find({
      user: { $in: [...currentUser.following, req.user._id] },
      isDeleted: false,
      isPrivate: false
    })
    .populate('user', 'username fullName profilePicture')
    .populate('likes', 'username')
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        select: 'username fullName profilePicture'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(posts);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single post
router.get('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('user', 'username fullName profilePicture')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullName profilePicture'
        }
      });

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user can view private post
    if (post.isPrivate && post.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a post
router.put('/:postId', auth, async (req, res) => {
  try {
    const { caption, location, tags, isPrivate } = req.body;

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    if (tags !== undefined) post.tags = tags.split(',').map(tag => tag.trim());
    if (isPrivate !== undefined) post.isPrivate = isPrivate;

    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post
router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    post.isDeleted = true;
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a post
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already liked
    if (post.likes.includes(req.user._id)) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    post.likes.push(req.user._id);
    await post.save();

    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unlike a post
router.delete('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString());
    await post.save();

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save/unsave a post
router.post('/:postId/save', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const post = await Post.findById(req.params.postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isSaved = user.savedPosts.includes(req.params.postId);

    if (isSaved) {
      // Unsave
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== req.params.postId);
      await user.save();
      res.json({ message: 'Post unsaved successfully' });
    } else {
      // Save
      user.savedPosts.push(req.params.postId);
      await user.save();
      res.json({ message: 'Post saved successfully' });
    }
  } catch (error) {
    console.error('Save/unsave post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get saved posts
router.get('/saved/posts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: {
        path: 'user',
        select: 'username fullName profilePicture'
      }
    });

    res.json(user.savedPosts);
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;