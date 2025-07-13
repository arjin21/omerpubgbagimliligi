const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const router = express.Router();

// Create a comment
router.post('/', auth, async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      user: req.user._id,
      post: postId,
      content,
      parentComment: parentCommentId || null
    });

    await comment.save();

    // Add comment to post
    post.comments.push(comment._id);
    await post.save();

    // Populate user info
    await comment.populate('user', 'username fullName profilePicture');

    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      post: req.params.postId,
      parentComment: null,
      isDeleted: false
    })
    .populate('user', 'username fullName profilePicture')
    .populate('likes', 'username')
    .populate({
      path: 'replies',
      populate: {
        path: 'user',
        select: 'username fullName profilePicture'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get replies for a comment
router.get('/:commentId/replies', auth, async (req, res) => {
  try {
    const replies = await Comment.find({
      parentComment: req.params.commentId,
      isDeleted: false
    })
    .populate('user', 'username fullName profilePicture')
    .populate('likes', 'username')
    .sort({ createdAt: 1 });

    res.json(replies);
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a comment
router.put('/:commentId', auth, async (req, res) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    comment.content = content;
    await comment.save();

    res.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment or the post
    const post = await Post.findById(comment.post);
    if (comment.user.toString() !== req.user._id.toString() && 
        post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    comment.isDeleted = true;
    await comment.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a comment
router.post('/:commentId/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if already liked
    if (comment.likes.includes(req.user._id)) {
      return res.status(400).json({ message: 'Comment already liked' });
    }

    comment.likes.push(req.user._id);
    await comment.save();

    res.json({ message: 'Comment liked successfully' });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unlike a comment
router.delete('/:commentId/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.likes = comment.likes.filter(id => id.toString() !== req.user._id.toString());
    await comment.save();

    res.json({ message: 'Comment unliked successfully' });
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;