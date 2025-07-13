import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';
import moment from 'moment';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 2 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Messages
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper>
          {conversations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No messages yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a conversation with someone!
              </Typography>
            </Box>
          ) : (
            <List>
              {conversations.map((conversation) => (
                <ListItem key={conversation._id} button>
                  <ListItemAvatar>
                    <Avatar src={conversation.participant.profilePicture}>
                      {conversation.participant.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={conversation.participant.username}
                    secondary={
                      <Box>
                        <Typography variant="body2" noWrap>
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {conversation.lastMessage ? moment(conversation.lastMessage.createdAt).fromNow() : ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Messages;