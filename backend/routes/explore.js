const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get explore posts (popular posts from users not followed)
router.get('/posts', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    
    // Get posts from users not followed, ordered by engagement
    const posts = await Post.aggregate([
      {
        $match: {
          user: { $nin: [...currentUser.following, req.user._id] },
          isDeleted: false,
          isPrivate: false
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $size: '$likes' },
              { $multiply: [{ $size: '$comments' }, 2] }
            ]
          }
        }
      },
      {
        $sort: { engagementScore: -1, createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    // Populate user and other fields
    const populatedPosts = await Post.populate(posts, [
      {
        path: 'user',
        select: 'username fullName profilePicture'
      },
      {
        path: 'likes',
        select: 'username'
      },
      {
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullName profilePicture'
        }
      }
    ]);

    res.json(populatedPosts);
  } catch (error) {
    console.error('Get explore posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending posts
router.get('/trending', auth, async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          isPrivate: false,
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $size: '$likes' },
              { $multiply: [{ $size: '$comments' }, 2] }
            ]
          }
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // Populate user and other fields
    const populatedPosts = await Post.populate(posts, [
      {
        path: 'user',
        select: 'username fullName profilePicture'
      },
      {
        path: 'likes',
        select: 'username'
      },
      {
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullName profilePicture'
        }
      }
    ]);

    res.json(populatedPosts);
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search posts by hashtags
router.get('/search/hashtags/:tag', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      tags: { $regex: req.params.tag, $options: 'i' },
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
    console.error('Search hashtags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get popular hashtags
router.get('/hashtags/popular', auth, async (req, res) => {
  try {
    const hashtags = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          isPrivate: false
        }
      },
      {
        $unwind: '$tags'
      },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json(hashtags);
  } catch (error) {
    console.error('Get popular hashtags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get suggested users for explore
router.get('/suggested-users', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    // Get users with high engagement that the current user is not following
    const suggestedUsers = await User.aggregate([
      {
        $match: {
          _id: { $nin: [...currentUser.following, req.user._id] }
        }
      },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'user',
          as: 'posts'
        }
      },
      {
        $addFields: {
          totalLikes: {
            $sum: {
              $map: {
                input: '$posts',
                as: 'post',
                in: { $size: '$$post.likes' }
              }
            }
          },
          totalComments: {
            $sum: {
              $map: {
                input: '$posts',
                as: 'post',
                in: { $size: '$$post.comments' }
              }
            }
          }
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: ['$totalLikes', { $multiply: ['$totalComments', 2] }]
          }
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          profilePicture: 1,
          bio: 1,
          followerCount: { $size: '$followers' },
          engagementScore: 1
        }
      }
    ]);

    res.json(suggestedUsers);
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get location-based posts
router.get('/location/:location', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      location: { $regex: req.params.location, $options: 'i' },
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
    console.error('Get location posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;