const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const router = express.Router();

// Get likes for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('likes', 'username fullName profilePicture');

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post.likes);
  } catch (error) {
    console.error('Get post likes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get likes for a comment
router.get('/comment/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId)
      .populate('likes', 'username fullName profilePicture');

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(comment.likes);
  } catch (error) {
    console.error('Get comment likes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;