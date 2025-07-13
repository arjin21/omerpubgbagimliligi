const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { auth, canCommentOnPost } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/comments/:postId
// @desc    Create a comment on a post
// @access  Private
router.post('/:postId', auth, canCommentOnPost, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentCommentId } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ message: 'Comment must be less than 1000 characters' });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create comment
    const comment = new Comment({
      post: postId,
      user: req.user._id,
      text: text.trim(),
      parentComment: parentCommentId || null
    });

    await comment.save();

    // Add comment to post
    await post.addComment(comment._id);

    // Populate user info
    await comment.populate('user', 'username fullName profilePicture isVerified');

    // If this is a reply, add to parent comment's replies
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        await parentComment.addReply(comment._id);
      }
    }

    // TODO: Create notification for comment

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/comments/:postId
// @desc    Get comments for a post
// @access  Private
router.get('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, page = 1, sort = 'newest' } = req.query;
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

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'most_liked':
        sortObj = { likeCount: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const comments = await Comment.find({
      post: postId,
      parentComment: null, // Only top-level comments
      isDeleted: { $ne: true }
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('replies', 'text user createdAt likeCount')
    .populate('replies.user', 'username fullName profilePicture isVerified')
    .populate('likes.user', 'username fullName profilePicture')
    .sort(sortObj)
    .limit(parseInt(limit))
    .skip(skip);

    // Add user interaction data
    const commentsWithInteractions = comments.map(comment => {
      const commentObj = comment.toObject();
      commentObj.isLiked = comment.isLikedBy(req.user._id);
      
      // Add interaction data to replies
      if (commentObj.replies) {
        commentObj.replies = commentObj.replies.map(reply => {
          const replyObj = reply.toObject();
          replyObj.isLiked = reply.isLikedBy ? reply.isLikedBy(req.user._id) : false;
          return replyObj;
        });
      }
      
      return commentObj;
    });

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: { $ne: true }
    });

    res.json({
      comments: commentsWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + comments.length < total
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/comments/:commentId/replies
// @desc    Get replies to a comment
// @access  Private
router.get('/:commentId/replies', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const parentComment = await Comment.findById(commentId);
    if (!parentComment || parentComment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const replies = await Comment.find({
      parentComment: commentId,
      isDeleted: { $ne: true }
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('likes.user', 'username fullName profilePicture')
    .sort({ createdAt: 1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Add user interaction data
    const repliesWithInteractions = replies.map(reply => {
      const replyObj = reply.toObject();
      replyObj.isLiked = reply.isLikedBy(req.user._id);
      return replyObj;
    });

    const total = await Comment.countDocuments({
      parentComment: commentId,
      isDeleted: { $ne: true }
    });

    res.json({
      replies: repliesWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + replies.length < total
      }
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/comments/:commentId
// @desc    Update a comment
// @access  Private
router.put('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ message: 'Comment must be less than 1000 characters' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    // Update comment
    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    // Populate user info
    await comment.populate('user', 'username fullName profilePicture isVerified');

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment or the post
    const post = await Post.findById(comment.post);
    const canDelete = comment.user.toString() === req.user._id.toString() || 
                     post.user.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Soft delete the comment
    await comment.softDelete();

    // Remove comment from post
    await post.removeComment(comment._id);

    // Remove from parent comment's replies if it's a reply
    if (comment.parentComment) {
      const parentComment = await Comment.findById(comment.parentComment);
      if (parentComment) {
        await parentComment.removeReply(comment._id);
      }
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments/:commentId/like
// @desc    Like a comment
// @access  Private
router.post('/:commentId/like', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if already liked
    if (comment.isLikedBy(req.user._id)) {
      return res.status(400).json({ message: 'Comment already liked' });
    }

    await comment.addLike(req.user._id);

    // TODO: Create notification for like

    res.json({ 
      message: 'Comment liked successfully',
      isLiked: true,
      likeCount: comment.likes.length
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/comments/:commentId/like
// @desc    Unlike a comment
// @access  Private
router.delete('/:commentId/like', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if liked
    if (!comment.isLikedBy(req.user._id)) {
      return res.status(400).json({ message: 'Comment not liked' });
    }

    await comment.removeLike(req.user._id);

    res.json({ 
      message: 'Comment unliked successfully',
      isLiked: false,
      likeCount: comment.likes.length
    });
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments/:commentId/report
// @desc    Report a comment
// @access  Private
router.post('/:commentId/report', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if already reported
    const alreadyReported = comment.flaggedBy.some(flag => 
      flag.user.toString() === req.user._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({ message: 'Comment already reported' });
    }

    // Add report
    await comment.flag(req.user._id, reason);

    res.json({ message: 'Comment reported successfully' });
  } catch (error) {
    console.error('Report comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;