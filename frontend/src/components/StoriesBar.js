import React, { useState, useEffect } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Paper,
  IconButton,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const StoriesBar = () => {
  const [stories, setStories] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await axios.get('/stories/feed');
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
        {/* Add Story Button */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
          <Avatar
            src={user?.profilePicture}
            sx={{
              width: 56,
              height: 56,
              border: '2px solid #e1306c',
              cursor: 'pointer',
              mb: 1,
            }}
          >
            {user?.username?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Typography variant="caption" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
            Your Story
          </Typography>
        </Box>

        {/* Stories */}
        {stories.map((story) => (
          <Box
            key={story._id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 80,
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/stories/${story.user.username}`)}
          >
            <Avatar
              src={story.user.profilePicture}
              sx={{
                width: 56,
                height: 56,
                border: '2px solid #e1306c',
                mb: 1,
              }}
            >
              {story.user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="caption" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
              {story.user.username}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default StoriesBar;