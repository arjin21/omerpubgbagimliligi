const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { uploadStoryMedia, validateStoryMedia, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/stories
// @desc    Create a new story
// @access  Private
router.post('/', auth, uploadStoryMedia, validateStoryMedia, async (req, res) => {
  try {
    const { caption, location, isPrivate, allowReplies, poll, question, music } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Story media is required' });
    }

    // Determine media type
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Create story
    const story = new Story({
      user: req.user._id,
      media: {
        type: mediaType,
        url: getFileUrl(req.file.filename, 'stories'),
        thumbnail: mediaType === 'video' ? getFileUrl(req.file.filename, 'stories') : undefined
      },
      caption: caption || '',
      location: location ? JSON.parse(location) : null,
      isPrivate: isPrivate === 'true',
      allowReplies: allowReplies !== 'false',
      poll: poll ? JSON.parse(poll) : null,
      question: question ? JSON.parse(question) : null,
      music: music ? JSON.parse(music) : null
    });

    await story.save();

    // Populate user info
    await story.populate('user', 'username fullName profilePicture isVerified');

    res.status(201).json({
      message: 'Story created successfully',
      story
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stories/feed
// @desc    Get stories feed (stories from followed users)
// @access  Private
router.get('/feed', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following;

    // Get active stories from followed users and current user
    const stories = await Story.find({
      user: { $in: [...followingIds, req.user._id] },
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 });

    // Group stories by user
    const storiesByUser = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = {
          user: story.user,
          stories: []
        };
      }
      storiesByUser[userId].stories.push(story);
    });

    // Convert to array and add view status
    const storiesFeed = Object.values(storiesByUser).map(userStories => {
      const userStoryObj = userStories.toObject ? userStories.toObject() : userStories;
      userStoryObj.stories = userStories.stories.map(story => {
        const storyObj = story.toObject();
        storyObj.isViewed = story.isViewedBy(req.user._id);
        return storyObj;
      });
      return userStoryObj;
    });

    res.json(storiesFeed);
  } catch (error) {
    console.error('Get stories feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stories/:storyId
// @desc    Get a specific story
// @access  Private
router.get('/:storyId', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId)
      .populate('user', 'username fullName profilePicture isVerified')
      .populate('views.user', 'username fullName profilePicture')
      .populate('replies.user', 'username fullName profilePicture');

    if (!story || !story.isActive || story.isExpired) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    // Check if user can view the story
    if (story.isPrivate && story.user._id.toString() !== req.user._id.toString()) {
      const storyOwner = await User.findById(story.user._id);
      const isFollowing = storyOwner.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This story is private' });
      }
    }

    // Mark as viewed
    await story.addView(req.user._id);

    const storyObj = story.toObject();
    storyObj.isViewed = true;

    res.json(storyObj);
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/stories/:storyId
// @desc    Delete a story
// @access  Private
router.delete('/:storyId', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    // Deactivate the story
    story.isActive = false;
    await story.save();

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:storyId/reply
// @desc    Reply to a story
// @access  Private
router.post('/:storyId/reply', auth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    if (text.length > 200) {
      return res.status(400).json({ message: 'Reply must be less than 200 characters' });
    }

    const story = await Story.findById(storyId);
    if (!story || !story.isActive || story.isExpired) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    if (!story.allowReplies) {
      return res.status(400).json({ message: 'Replies are not allowed on this story' });
    }

    // Check if user can view the story
    if (story.isPrivate && story.user._id.toString() !== req.user._id.toString()) {
      const storyOwner = await User.findById(story.user._id);
      const isFollowing = storyOwner.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This story is private' });
      }
    }

    await story.addReply(req.user._id, text.trim());

    // TODO: Create notification for reply

    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply to story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:storyId/poll-vote
// @desc    Vote on a story poll
// @access  Private
router.post('/:storyId/poll-vote', auth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { option } = req.body;

    if (option === undefined || option < 0) {
      return res.status(400).json({ message: 'Valid option is required' });
    }

    const story = await Story.findById(storyId);
    if (!story || !story.isActive || story.isExpired) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    if (!story.poll) {
      return res.status(400).json({ message: 'This story does not have a poll' });
    }

    if (option >= story.poll.options.length) {
      return res.status(400).json({ message: 'Invalid option' });
    }

    await story.votePoll(req.user._id, option);

    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Vote on poll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:storyId/answer-question
// @desc    Answer a story question
// @access  Private
router.post('/:storyId/answer-question', auth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ message: 'Answer is required' });
    }

    const story = await Story.findById(storyId);
    if (!story || !story.isActive || story.isExpired) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    if (!story.question) {
      return res.status(400).json({ message: 'This story does not have a question' });
    }

    await story.answerQuestion(req.user._id, answer.trim());

    res.json({ message: 'Answer recorded successfully' });
  } catch (error) {
    console.error('Answer question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:storyId/highlight
// @desc    Add story to highlights
// @access  Private
router.post('/:storyId/highlight', auth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { title, cover } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Highlight title is required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add this story to highlights' });
    }

    await story.addToHighlight(title, cover);

    res.json({ message: 'Story added to highlights successfully' });
  } catch (error) {
    console.error('Add to highlight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/stories/:storyId/highlight
// @desc    Remove story from highlights
// @access  Private
router.delete('/:storyId/highlight', auth, async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove this story from highlights' });
    }

    await story.removeFromHighlight();

    res.json({ message: 'Story removed from highlights successfully' });
  } catch (error) {
    console.error('Remove from highlight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stories/highlights/:userId
// @desc    Get user's story highlights
// @access  Private
router.get('/highlights/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can view highlights
    if (user.isPrivate && user._id.toString() !== req.user._id.toString()) {
      const isFollowing = user.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({ message: 'This account is private' });
      }
    }

    const highlights = await Story.find({
      user: userId,
      'highlight.isHighlight': true
    })
    .populate('user', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 });

    // Group by highlight title
    const highlightsByTitle = {};
    highlights.forEach(story => {
      const title = story.highlight.highlightTitle;
      if (!highlightsByTitle[title]) {
        highlightsByTitle[title] = {
          title,
          cover: story.highlight.highlightCover,
          stories: []
        };
      }
      highlightsByTitle[title].stories.push(story);
    });

    res.json(Object.values(highlightsByTitle));
  } catch (error) {
    console.error('Get highlights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;