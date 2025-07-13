const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1, type, isRead } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { recipient: req.user._id };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .populate('sender', 'username fullName profilePicture isVerified')
      .populate('post', 'images caption')
      .populate('comment', 'text')
      .populate('story', 'media caption')
      .populate('message', 'content')
      .populate('conversation', 'participants')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.post('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark this notification as read' });
    }

    await notification.markAsRead();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/notifications/:notificationId/seen
// @desc    Mark notification as seen
// @access  Private
router.post('/:notificationId/seen', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark this notification as seen' });
    }

    await notification.markAsSeen();

    res.json({ message: 'Notification marked as seen' });
  } catch (error) {
    console.error('Mark notification as seen error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.post('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user._id);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/notifications/mark-all-seen
// @desc    Mark all notifications as seen
// @access  Private
router.post('/mark-all-seen', auth, async (req, res) => {
  try {
    await Notification.markAllAsSeen(req.user._id);

    res.json({ message: 'All notifications marked as seen' });
  } catch (error) {
    console.error('Mark all notifications as seen error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/:notificationId', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.remove();

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/notifications/settings
// @desc    Get notification settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.user._id);
    
    const settings = {
      push: {
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        messages: true,
        stories: true,
        live: true,
        security: true
      },
      email: {
        likes: false,
        comments: false,
        follows: true,
        mentions: true,
        messages: false,
        stories: false,
        live: true,
        security: true
      },
      sms: {
        security: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/notifications/settings
// @desc    Update notification settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { push, email, sms } = req.body;

    // TODO: Update user's notification settings in database
    // For now, just return success

    res.json({ message: 'Notification settings updated successfully' });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/notifications/test
// @desc    Send test notification
// @access  Private
router.post('/test', auth, async (req, res) => {
  try {
    const { type, title, body } = req.body;

    if (!type || !title || !body) {
      return res.status(400).json({ message: 'Type, title, and body are required' });
    }

    const notification = await Notification.createNotification({
      recipient: req.user._id,
      sender: req.user._id, // Self notification for test
      type: 'system_message',
      title,
      body,
      data: {
        systemMessage: 'This is a test notification'
      }
    });

    res.json({
      message: 'Test notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;