import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';
import PostCard from '../components/PostCard';

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExplorePosts();
  }, []);

  const fetchExplorePosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/explore/posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching explore posts:', error);
      setError('Failed to load posts');
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
          Explore
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {posts.map((post) => (
            <Grid item xs={12} sm={6} md={4} key={post._id}>
              <Box
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                <img
                  src={post.images[0]}
                  alt="Post"
                  style={{
                    width: '100%',
                    height: 300,
                    objectFit: 'cover',
                  }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>

        {posts.length === 0 && !loading && (
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No posts to explore yet
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default Explore;