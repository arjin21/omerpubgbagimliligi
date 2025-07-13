const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Story = require('../models/Story');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/explore
// @desc    Get explore feed (trending posts)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1, type = 'posts' } = req.query;
    const skip = (page - 1) * limit;

    let content;
    let total;

    if (type === 'posts') {
      // Get trending posts (excluding user's own posts and posts from followed users)
      const currentUser = await User.findById(req.user._id);
      const followingIds = currentUser.following;

      content = await Post.find({
        _id: { $nin: currentUser.savedPosts },
        user: { $nin: [...followingIds, req.user._id] },
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

      total = await Post.countDocuments({
        _id: { $nin: currentUser.savedPosts },
        user: { $nin: [...followingIds, req.user._id] },
        isDeleted: { $ne: true },
        isPrivate: false
      });

      // Add user interaction data
      content = content.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = post.isLikedBy(req.user._id);
        postObj.isSaved = post.isSavedBy(req.user._id);
        return postObj;
      });
    } else if (type === 'stories') {
      // Get trending stories
      content = await Story.find({
        isActive: true,
        expiresAt: { $gt: new Date() },
        isPrivate: false
      })
      .populate('user', 'username fullName profilePicture isVerified')
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

      total = await Story.countDocuments({
        isActive: true,
        expiresAt: { $gt: new Date() },
        isPrivate: false
      });

      // Add view status
      content = content.map(story => {
        const storyObj = story.toObject();
        storyObj.isViewed = story.isViewedBy(req.user._id);
        return storyObj;
      });
    }

    res.json({
      content,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + content.length < total
      }
    });
  } catch (error) {
    console.error('Get explore feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/explore/hashtags
// @desc    Get trending hashtags
// @access  Private
router.get('/hashtags', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Aggregate to get hashtag counts
    const hashtags = await Post.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isPrivate: false,
          hashtags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$hashtags'
      },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          recentPosts: { $push: { $cond: [{ $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, '$_id', null] } }
        }
      },
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          recentCount: { $size: { $filter: { input: '$recentPosts', cond: { $ne: ['$$this', null] } } } }
        }
      },
      {
        $sort: { recentCount: -1, count: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json(hashtags);
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/explore/hashtags/:hashtag
// @desc    Get posts by hashtag
// @access  Private
router.get('/hashtags/:hashtag', auth, async (req, res) => {
  try {
    const { hashtag } = req.params;
    const { limit = 20, page = 1, sort = 'recent' } = req.query;
    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'top':
        sortObj = { likeCount: -1, commentCount: -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const posts = await Post.find({
      hashtags: { $in: [hashtag.toLowerCase()] },
      isDeleted: { $ne: true },
      isPrivate: false
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('comments', 'text user createdAt')
    .populate('likes.user', 'username fullName profilePicture')
    .sort(sortObj)
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
      hashtags: { $in: [hashtag.toLowerCase()] },
      isDeleted: { $ne: true },
      isPrivate: false
    });

    res.json({
      hashtag,
      posts: postsWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    });
  } catch (error) {
    console.error('Get posts by hashtag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/explore/locations
// @desc    Get trending locations
// @access  Private
router.get('/locations', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Aggregate to get location counts
    const locations = await Post.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isPrivate: false,
          'location.name': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$location.name',
          count: { $sum: 1 },
          coordinates: { $first: '$location.coordinates' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json(locations);
  } catch (error) {
    console.error('Get trending locations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/explore/locations/:location
// @desc    Get posts by location
// @access  Private
router.get('/locations/:location', auth, async (req, res) => {
  try {
    const { location } = req.params;
    const { limit = 20, page = 1, sort = 'recent' } = req.query;
    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'top':
        sortObj = { likeCount: -1, commentCount: -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const posts = await Post.find({
      'location.name': { $regex: location, $options: 'i' },
      isDeleted: { $ne: true },
      isPrivate: false
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('comments', 'text user createdAt')
    .populate('likes.user', 'username fullName profilePicture')
    .sort(sortObj)
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
      'location.name': { $regex: location, $options: 'i' },
      isDeleted: { $ne: true },
      isPrivate: false
    });

    res.json({
      location,
      posts: postsWithInteractions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + posts.length < total
      }
    });
  } catch (error) {
    console.error('Get posts by location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/explore/suggestions
// @desc    Get user suggestions for explore
// @access  Private
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following;

    // Get users that the current user doesn't follow
    const suggestions = await User.find({
      _id: { $nin: [...followingIds, req.user._id] },
      isActive: true,
      isDeleted: { $ne: true },
      isPrivate: false
    })
    .select('username fullName profilePicture isVerified followerCount')
    .limit(parseInt(limit))
    .sort({ followerCount: -1, createdAt: -1 });

    res.json(suggestions);
  } catch (error) {
    console.error('Get user suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/explore/search
// @desc    Search explore content
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, type = 'all', limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    let results = {};
    let total = 0;

    if (type === 'all' || type === 'posts') {
      const posts = await Post.find({
        $or: [
          { caption: searchRegex },
          { hashtags: searchRegex }
        ],
        isDeleted: { $ne: true },
        isPrivate: false
      })
      .populate('user', 'username fullName profilePicture isVerified')
      .populate('comments', 'text user createdAt')
      .populate('likes.user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

      const postsWithInteractions = posts.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = post.isLikedBy(req.user._id);
        postObj.isSaved = post.isSavedBy(req.user._id);
        return postObj;
      });

      results.posts = postsWithInteractions;
      total += await Post.countDocuments({
        $or: [
          { caption: searchRegex },
          { hashtags: searchRegex }
        ],
        isDeleted: { $ne: true },
        isPrivate: false
      });
    }

    if (type === 'all' || type === 'users') {
      const users = await User.find({
        $or: [
          { username: searchRegex },
          { fullName: searchRegex }
        ],
        isActive: true,
        isDeleted: { $ne: true }
      })
      .select('username fullName profilePicture isVerified followerCount')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ followerCount: -1 });

      results.users = users;
      total += await User.countDocuments({
        $or: [
          { username: searchRegex },
          { fullName: searchRegex }
        ],
        isActive: true,
        isDeleted: { $ne: true }
      });
    }

    if (type === 'all' || type === 'hashtags') {
      const hashtags = await Post.aggregate([
        {
          $match: {
            hashtags: searchRegex,
            isDeleted: { $ne: true },
            isPrivate: false
          }
        },
        {
          $unwind: '$hashtags'
        },
        {
          $match: {
            hashtags: searchRegex
          }
        },
        {
          $group: {
            _id: '$hashtags',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      results.hashtags = hashtags;
      total += hashtags.length;
    }

    res.json({
      query: q,
      results,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + Object.values(results).flat().length < total
      }
    });
  } catch (error) {
    console.error('Search explore error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;