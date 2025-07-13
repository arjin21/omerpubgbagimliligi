import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SuggestedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    try {
      const response = await axios.get('/users/suggested/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await axios.post(`/users/follow/${userId}`);
      // Remove the user from the list after following
      setUsers(prev => prev.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Suggested for you
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Paper>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Suggested for you
      </Typography>
      <List sx={{ p: 0 }}>
        {users.map((user) => (
          <ListItem key={user._id} sx={{ px: 0 }}>
            <ListItemAvatar>
              <Avatar
                src={user.profilePicture}
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/${user.username}`)}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography
                  variant="subtitle2"
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => navigate(`/${user.username}`)}
                >
                  {user.username}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {user.bio || 'No bio'}
                </Typography>
              }
            />
            <Button
              size="small"
              variant="text"
              onClick={() => handleFollow(user._id)}
              sx={{ minWidth: 'auto', color: '#0095f6' }}
            >
              Follow
            </Button>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default SuggestedUsers;