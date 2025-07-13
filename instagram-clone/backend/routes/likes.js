const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/likes/:postId
// @desc    Get likes for a post
// @access  Private
router.get('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user can view the post
    if (post.isPrivate && post.user.toString() !== req.user._id.toString()) {
      const postOwner = await require('../models/User').findById(post.user);
      const isFollowing = postOwner.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This post is private' });
      }
    }

    const likes = await Post.findById(postId)
      .populate('likes.user', 'username fullName profilePicture isVerified')
      .select('likes');

    const total = likes.likes.length;
    const paginatedLikes = likes.likes.slice(skip, skip + parseInt(limit));

    res.json({
      likes: paginatedLikes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + paginatedLikes.length < total
      }
    });
  } catch (error) {
    console.error('Get post likes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/likes/comment/:commentId
// @desc    Get likes for a comment
// @access  Private
router.get('/comment/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const likes = await Comment.findById(commentId)
      .populate('likes.user', 'username fullName profilePicture isVerified')
      .select('likes');

    const total = likes.likes.length;
    const paginatedLikes = likes.likes.slice(skip, skip + parseInt(limit));

    res.json({
      likes: paginatedLikes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + paginatedLikes.length < total
      }
    });
  } catch (error) {
    console.error('Get comment likes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;