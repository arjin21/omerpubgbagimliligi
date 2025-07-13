const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const router = express.Router();

// Send a message
router.post('/', auth, uploadSingle, async (req, res) => {
  try {
    const { receiverId, content, replyTo } = req.body;
    
    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const messageData = {
      sender: req.user._id,
      receiver: receiverId,
      content: content || '',
      replyTo: replyTo || null
    };

    // Handle media upload
    if (req.file) {
      messageData.media = `/uploads/${req.file.filename}`;
      messageData.mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 
                             req.file.mimetype.startsWith('video/') ? 'video' : 
                             req.file.mimetype.startsWith('audio/') ? 'audio' : 'file';
    }

    const message = new Message(messageData);
    await message.save();

    // Populate sender info
    await message.populate('sender', 'username fullName profilePicture');

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation with a user
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ],
      isDeleted: false
    })
    .populate('sender', 'username fullName profilePicture')
    .populate('receiver', 'username fullName profilePicture')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    // Get the latest message from each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ],
          isDeleted: false
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Populate user info for each conversation
    const populatedConversations = await Message.populate(conversations, [
      {
        path: 'lastMessage.sender',
        select: 'username fullName profilePicture'
      },
      {
        path: 'lastMessage.receiver',
        select: 'username fullName profilePicture'
      },
      {
        path: '_id',
        select: 'username fullName profilePicture'
      }
    ]);

    res.json(populatedConversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark message as read
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the receiver
    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all messages from a user as read
router.put('/conversation/:userId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    console.error('Mark conversation read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
      isDeleted: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;