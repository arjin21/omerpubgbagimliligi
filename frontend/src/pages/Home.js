import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';
import SuggestedUsers from '../components/SuggestedUsers';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`/posts/feed?page=${pageNum}&limit=5`);
      
      if (pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.data.length === 5);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => 
      prev.map(post => 
        post._id === updatedPost._id ? updatedPost : post
      )
    );
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(post => post._id !== postId));
  };

  if (loading && posts.length === 0) {
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
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 3 }}>
            <StoriesBar />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {posts.length === 0 && !loading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No posts yet. Follow some users to see their posts here!
              </Typography>
            </Paper>
          ) : (
            <Box>
              {posts.map((post) => (
                <Box key={post._id} sx={{ mb: 3 }}>
                  <PostCard
                    post={post}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                </Box>
              ))}
              
              {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <CircularProgress />
                </Box>
              )}
            </Box>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: 100 }}>
            <SuggestedUsers />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;