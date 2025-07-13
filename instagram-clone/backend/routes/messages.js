const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { auth, canMessageUser } = require('../middleware/auth');
const { uploadMessageMedia, validateMessageMedia, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/messages/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      participants: req.user._id,
      isDeleted: { $ne: true },
      'archivedBy.user': { $ne: req.user._id }
    })
    .populate('participants', 'username fullName profilePicture isVerified')
    .populate('lastMessage')
    .populate('lastMessage.sender', 'username fullName profilePicture')
    .populate('lastMessage.recipient', 'username fullName profilePicture')
    .sort({ lastMessageAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Add unread count and settings for each conversation
    const conversationsWithData = conversations.map(conversation => {
      const convObj = conversation.toObject();
      const userSetting = conversation.settings.participantSettings.find(
        setting => setting.user.toString() === req.user._id.toString()
      );
      
      convObj.unreadCount = conversation.getUnreadCount(req.user._id);
      convObj.isMuted = userSetting ? userSetting.isMuted : false;
      convObj.isPinned = userSetting ? userSetting.isPinned : false;
      
      return convObj;
    });

    const total = await Conversation.countDocuments({
      participants: req.user._id,
      isDeleted: { $ne: true },
      'archivedBy.user': { $ne: req.user._id }
    });

    res.json({
      conversations: conversationsWithData,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + conversations.length < total
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/conversations
// @desc    Create or get conversation
// @access  Private
router.post('/conversations', auth, canMessageUser, async (req, res) => {
  try {
    const { recipientId, isGroup, groupInfo } = req.body;

    if (isGroup) {
      // Create group conversation
      if (!groupInfo || !groupInfo.name) {
        return res.status(400).json({ message: 'Group name is required' });
      }

      const conversation = new Conversation({
        participants: [req.user._id, ...groupInfo.participants],
        isGroup: true,
        groupInfo: {
          ...groupInfo,
          createdBy: req.user._id,
          admins: [req.user._id]
        }
      });

      await conversation.save();
      await conversation.populate('participants', 'username fullName profilePicture isVerified');

      res.status(201).json({
        message: 'Group conversation created successfully',
        conversation
      });
    } else {
      // Find or create direct conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, recipientId] },
        isGroup: false,
        isDeleted: { $ne: true }
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [req.user._id, recipientId],
          isGroup: false
        });
        await conversation.save();
      }

      await conversation.populate('participants', 'username fullName profilePicture isVerified');

      res.json({
        message: 'Conversation found/created successfully',
        conversation
      });
    }
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/conversations/:conversationId
// @desc    Get conversation details
// @access  Private
router.get('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username fullName profilePicture isVerified')
      .populate('lastMessage')
      .populate('lastMessage.sender', 'username fullName profilePicture')
      .populate('lastMessage.recipient', 'username fullName profilePicture');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }

    // Mark messages as read
    await conversation.markAsRead(req.user._id);

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/conversations/:conversationId/messages
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversations/:conversationId/messages', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: { $ne: true }
    })
    .populate('sender', 'username fullName profilePicture isVerified')
    .populate('recipient', 'username fullName profilePicture isVerified')
    .populate('replyTo')
    .populate('replyTo.sender', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Mark messages as read
    await conversation.markAsRead(req.user._id);

    // Mark messages as delivered
    messages.forEach(async (message) => {
      if (message.recipient._id.toString() === req.user._id.toString() && !message.isDelivered) {
        await message.markAsDelivered();
      }
    });

    const total = await Message.countDocuments({
      conversation: conversationId,
      isDeleted: { $ne: true }
    });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + messages.length < total
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/conversations/:conversationId/messages
// @desc    Send a message
// @access  Private
router.post('/conversations/:conversationId/messages', auth, uploadMessageMedia, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, replyTo, scheduledFor } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }

    // Check if conversation is muted
    const userSetting = conversation.settings.participantSettings.find(
      setting => setting.user.toString() === req.user._id.toString()
    );
    if (userSetting && userSetting.isMuted) {
      return res.status(400).json({ message: 'Cannot send messages in muted conversation' });
    }

    // Determine recipient (for direct messages)
    let recipientId = req.user._id;
    if (!conversation.isGroup) {
      recipientId = conversation.participants.find(p => p.toString() !== req.user._id.toString());
    }

    // Create message content
    const messageContent = {
      type: 'text',
      text: text || ''
    };

    // Handle media upload
    if (req.file) {
      messageContent.type = req.file.mimetype.startsWith('image/') ? 'image' : 
                           req.file.mimetype.startsWith('video/') ? 'video' : 
                           req.file.mimetype.startsWith('audio/') ? 'audio' : 'file';
      messageContent.media = {
        url: getFileUrl(req.file.filename, 'messages'),
        filename: req.file.originalname,
        size: req.file.size
      };
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      recipient: recipientId,
      content: messageContent,
      replyTo: replyTo || null,
      isScheduled: !!scheduledFor,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    });

    await message.save();

    // Update conversation
    await conversation.updateLastMessage(message._id);
    if (!conversation.isGroup) {
      await conversation.incrementUnreadCount(recipientId);
    }

    // Populate message data
    await message.populate('sender', 'username fullName profilePicture isVerified');
    await message.populate('recipient', 'username fullName profilePicture isVerified');
    if (replyTo) {
      await message.populate('replyTo');
      await message.populate('replyTo.sender', 'username fullName profilePicture');
    }

    res.status(201).json({
      message: 'Message sent successfully',
      message: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user owns the message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    // Check if message is too old to edit (e.g., 15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
      return res.status(400).json({ message: 'Message is too old to edit' });
    }

    await message.edit(text.trim());

    // Populate message data
    await message.populate('sender', 'username fullName profilePicture isVerified');
    await message.populate('recipient', 'username fullName profilePicture isVerified');

    res.json({
      message: 'Message edited successfully',
      message: message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user owns the message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await message.softDelete(req.user._id);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:messageId/reactions
// @desc    Add reaction to message
// @access  Private
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.addReaction(req.user._id, emoji);

    res.json({ message: 'Reaction added successfully' });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId/reactions
// @desc    Remove reaction from message
// @access  Private
router.delete('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.removeReaction(req.user._id);

    res.json({ message: 'Reaction removed successfully' });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/conversations/:conversationId/mute
// @desc    Mute conversation
// @access  Private
router.post('/conversations/:conversationId/mute', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to mute this conversation' });
    }

    await conversation.muteForUser(req.user._id);

    res.json({ message: 'Conversation muted successfully' });
  } catch (error) {
    console.error('Mute conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/conversations/:conversationId/mute
// @desc    Unmute conversation
// @access  Private
router.delete('/conversations/:conversationId/mute', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to unmute this conversation' });
    }

    await conversation.unmuteForUser(req.user._id);

    res.json({ message: 'Conversation unmuted successfully' });
  } catch (error) {
    console.error('Unmute conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;