import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  MoreVert as MoreIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachIcon,
  Favorite as LikeIcon,
  FavoriteBorder as UnlikeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import moment from 'moment';

const DirectMessage = ({ conversation, onClose }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const otherUser = conversation.participant;

  useEffect(() => {
    fetchMessages();
    if (socket) {
      socket.emit('join_conversation', conversation._id);
      
      socket.on('receive_message', handleReceiveMessage);
      socket.on('typing_start', handleTypingStart);
      socket.on('typing_stop', handleTypingStop);
    }

    return () => {
      if (socket) {
        socket.emit('leave_conversation', conversation._id);
        socket.off('receive_message', handleReceiveMessage);
        socket.off('typing_start', handleTypingStart);
        socket.off('typing_stop', handleTypingStop);
      }
    };
  }, [conversation._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/messages/${conversation._id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveMessage = (message) => {
    if (message.conversationId === conversation._id) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleTypingStart = (data) => {
    if (data.conversationId === conversation._id && data.userId !== user._id) {
      setIsTyping(true);
    }
  };

  const handleTypingStop = (data) => {
    if (data.conversationId === conversation._id && data.userId !== user._id) {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`/messages/${conversation._id}`, {
        content: newMessage,
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');

      if (socket) {
        socket.emit('send_message', {
          conversationId: conversation._id,
          message: response.data,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!typing) {
      setTyping(true);
      if (socket) {
        socket.emit('typing_start', {
          conversationId: conversation._id,
          userId: user._id,
        });
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      if (socket) {
        socket.emit('typing_stop', {
          conversationId: conversation._id,
          userId: user._id,
        });
      }
    }, 1000);
  };

  const handleLikeMessage = async (messageId) => {
    try {
      await axios.post(`/messages/${messageId}/like`);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, likes: [...msg.likes, user._id] }
            : msg
        )
      );
    } catch (error) {
      console.error('Error liking message:', error);
    }
  };

  const handleUnlikeMessage = async (messageId) => {
    try {
      await axios.delete(`/messages/${messageId}/like`);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, likes: msg.likes.filter(id => id !== user._id) }
            : msg
        )
      );
    } catch (error) {
      console.error('Error unliking message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isOwnMessage = (message) => message.sender._id === user._id;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <Avatar src={otherUser.profilePicture} sx={{ mr: 2 }}>
          {otherUser.username.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {otherUser.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {otherUser.isOnline ? 'Active now' : 'Offline'}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <MoreIcon />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <List sx={{ p: 0 }}>
          {messages.map((message) => (
            <ListItem
              key={message._id}
              sx={{
                flexDirection: 'column',
                alignItems: isOwnMessage(message) ? 'flex-end' : 'flex-start',
                p: 0,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  maxWidth: '70%',
                  backgroundColor: isOwnMessage(message) ? '#0095f6' : '#f0f0f0',
                  color: isOwnMessage(message) ? 'white' : 'black',
                  borderRadius: 2,
                  p: 1.5,
                  position: 'relative',
                }}
              >
                <Typography variant="body2">{message.content}</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {moment(message.createdAt).format('HH:mm')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() =>
                        message.likes.includes(user._id)
                          ? handleUnlikeMessage(message._id)
                          : handleLikeMessage(message._id)
                      }
                      sx={{ color: 'inherit', p: 0.5 }}
                    >
                      {message.likes.includes(user._id) ? (
                        <LikeIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <UnlikeIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                    
                    {message.likes.length > 0 && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {message.likes.length}
                      </Typography>
                    )}

                    {isOwnMessage(message) && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setSelectedMessage(message);
                          setAnchorEl(e.currentTarget);
                        }}
                        sx={{ color: 'inherit', p: 0.5 }}
                      >
                        <MoreIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </ListItem>
          ))}
          
          {isTyping && (
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', p: 0, mb: 1 }}>
              <Box
                sx={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  {otherUser.username} is typing...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small">
            <AttachIcon />
          </IconButton>
          <IconButton size="small">
            <EmojiIcon />
          </IconButton>
          <TextField
            fullWidth
            placeholder="Message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            variant="outlined"
            size="small"
            multiline
            maxRows={4}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            color="primary"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Message Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { setAnchorEl(null); }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => handleDeleteMessage(selectedMessage?._id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default DirectMessage;