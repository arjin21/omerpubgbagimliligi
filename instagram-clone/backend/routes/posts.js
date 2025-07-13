const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadPostMedia, validatePostMedia, getFileUrl, deleteFile } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, uploadPostMedia, validatePostMedia, async (req, res) => {
  try {
    const { caption, location, tags, isPrivate, allowComments } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one media file is required' });
    }

    // Process uploaded files
    const images = req.files.map(file => ({
      url: getFileUrl(file.filename, 'posts'),
      caption: '',
      altText: file.originalname
    }));

    // Determine post type
    const postType = req.files.length > 1 ? 'carousel' : 
                    req.files[0].mimetype.startsWith('video/') ? 'video' : 'image';

    // Create post
    const post = new Post({
      user: req.user._id,
      images,
      caption: caption || '',
      location: location ? JSON.parse(location) : null,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPrivate: isPrivate === 'true',
      allowComments: allowComments !== 'false',
      type: postType
    });

    await post.save();

    // Populate user info
    await post.populate('user', 'username fullName profilePicture isVerified');

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/feed
// @desc    Get user's feed (posts from followed users)
// @access  Private
router.get('/feed', auth, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following;

    // Get posts from followed users and current user
    const posts = await Post.find({
      user: { $in: [...followingIds, req.user._id] },
      isDeleted: { $ne: true }
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('comments', 'text user createdAt')
    .populate('likes.user', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Add user interaction data
    const postsWithInteractions = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.isLikedBy(req.user._id);
      postObj.isSaved = post.isSavedBy(req.user._id);
      return postObj;
    });

    const total = await Post.countDocuments({
      user: { $in: [...followingIds, req.user._id] },
      isDeleted: { $ne: true }
    });

    res.json({
      posts: postsWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/:postId
// @desc    Get a specific post
// @access  Private
router.get('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('user', 'username fullName profilePicture isVerified')
      .populate('comments', 'text user createdAt')
      .populate('likes.user', 'username fullName profilePicture');

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user can view the post
    if (post.isPrivate && post.user._id.toString() !== req.user._id.toString()) {
      const postOwner = await User.findById(post.user._id);
      const isFollowing = postOwner.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This post is private' });
      }
    }

    // Increment view count
    await post.incrementView();

    const postObj = post.toObject();
    postObj.isLiked = post.isLikedBy(req.user._id);
    postObj.isSaved = post.isSavedBy(req.user._id);

    res.json(postObj);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/posts/:postId
// @desc    Update a post
// @access  Private
router.put('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption, location, tags, isPrivate, allowComments } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // Update post
    const updateData = {};
    if (caption !== undefined) updateData.caption = caption;
    if (location !== undefined) updateData.location = location ? JSON.parse(location) : null;
    if (tags !== undefined) updateData.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate === 'true';
    if (allowComments !== undefined) updateData.allowComments = allowComments !== 'false';

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('user', 'username fullName profilePicture isVerified');

    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId
// @desc    Delete a post
// @access  Private
router.delete('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Soft delete the post
    post.isDeleted = true;
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/like
// @desc    Like a post
// @access  Private
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already liked
    if (post.isLikedBy(req.user._id)) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    await post.addLike(req.user._id);

    // TODO: Create notification for like

    res.json({ 
      message: 'Post liked successfully',
      isLiked: true,
      likeCount: post.likes.length
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId/like
// @desc    Unlike a post
// @access  Private
router.delete('/:postId/like', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if liked
    if (!post.isLikedBy(req.user._id)) {
      return res.status(400).json({ message: 'Post not liked' });
    }

    await post.removeLike(req.user._id);

    res.json({ 
      message: 'Post unliked successfully',
      isLiked: false,
      likeCount: post.likes.length
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/save
// @desc    Save a post
// @access  Private
router.post('/:postId/save', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already saved
    if (post.isSavedBy(req.user._id)) {
      return res.status(400).json({ message: 'Post already saved' });
    }

    await post.addSave(req.user._id);

    // Add to user's saved posts
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { savedPosts: postId }
    });

    res.json({ 
      message: 'Post saved successfully',
      isSaved: true
    });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId/save
// @desc    Unsave a post
// @access  Private
router.delete('/:postId/save', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if saved
    if (!post.isSavedBy(req.user._id)) {
      return res.status(400).json({ message: 'Post not saved' });
    }

    await post.removeSave(req.user._id);

    // Remove from user's saved posts
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedPosts: postId }
    });

    res.json({ 
      message: 'Post unsaved successfully',
      isSaved: false
    });
  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/saved
// @desc    Get user's saved posts
// @access  Private
router.get('/saved', auth, async (req, res) => {
  try {
    const { limit = 12, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).populate('savedPosts');
    const savedPostIds = user.savedPosts.map(post => post._id);

    const posts = await Post.find({
      _id: { $in: savedPostIds },
      isDeleted: { $ne: true }
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('comments', 'text user createdAt')
    .populate('likes.user', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Add user interaction data
    const postsWithInteractions = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.isLikedBy(req.user._id);
      postObj.isSaved = true; // These are saved posts
      return postObj;
    });

    const total = savedPostIds.length;

    res.json({
      posts: postsWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/share
// @desc    Share a post
// @access  Private
router.post('/:postId/share', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Increment share count
    post.shareCount += 1;
    await post.save();

    res.json({ 
      message: 'Post shared successfully',
      shareCount: post.shareCount
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/report
// @desc    Report a post
// @access  Private
router.post('/:postId/report', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already reported
    const alreadyReported = post.flaggedBy.some(flag => 
      flag.user.toString() === req.user._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({ message: 'Post already reported' });
    }

    // Add report
    post.flaggedBy.push({
      user: req.user._id,
      reason
    });

    // Mark as flagged if enough reports
    if (post.flaggedBy.length >= 3) {
      post.isFlagged = true;
    }

    await post.save();

    res.json({ message: 'Post reported successfully' });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/trending
// @desc    Get trending posts
// @access  Public (with optional auth)
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      isDeleted: { $ne: true },
      isPrivate: false
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('comments', 'text user createdAt')
    .populate('likes.user', 'username fullName profilePicture')
    .sort({ 
      likeCount: -1, 
      commentCount: -1, 
      viewCount: -1, 
      createdAt: -1 
    })
    .limit(parseInt(limit))
    .skip(skip);

    // Add user interaction data if authenticated
    const postsWithInteractions = posts.map(post => {
      const postObj = post.toObject();
      if (req.user) {
        postObj.isLiked = post.isLikedBy(req.user._id);
        postObj.isSaved = post.isSavedBy(req.user._id);
      }
      return postObj;
    });

    const total = await Post.countDocuments({
      isDeleted: { $ne: true },
      isPrivate: false
    });

    res.json({
      posts: postsWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;