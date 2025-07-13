import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import PostCard from '../components/PostCard';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/users/${username}`);
      setUser(response.data.user);
      setPosts(response.data.posts);
      setIsFollowing(response.data.user.followers.includes(currentUser?._id));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('User not found');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await axios.post(`/users/unfollow/${user._id}`);
        setIsFollowing(false);
        setUser(prev => ({
          ...prev,
          followers: prev.followers.filter(id => id !== currentUser._id)
        }));
      } else {
        await axios.post(`/users/follow/${user._id}`);
        setIsFollowing(true);
        setUser(prev => ({
          ...prev,
          followers: [...prev.followers, currentUser._id]
        }));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
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

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  const isOwnProfile = currentUser?.username === username;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 2 }}>
        {/* Profile Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item>
              <Avatar
                src={user.profilePicture}
                sx={{ width: 100, height: 100 }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ mr: 2 }}>
                  {user.username}
                </Typography>
                {!isOwnProfile && (
                  <Button
                    variant={isFollowing ? "outlined" : "contained"}
                    onClick={handleFollow}
                    sx={{ mr: 1 }}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
                {isOwnProfile && (
                  <Button variant="outlined" sx={{ mr: 1 }}>
                    Edit Profile
                  </Button>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                <Typography variant="body2">
                  <strong>{posts.length}</strong> posts
                </Typography>
                <Typography variant="body2">
                  <strong>{user.followers.length}</strong> followers
                </Typography>
                <Typography variant="body2">
                  <strong>{user.following.length}</strong> following
                </Typography>
              </Box>
              
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {user.fullName}
              </Typography>
              
              {user.bio && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {user.bio}
                </Typography>
              )}
              
              {user.website && (
                <Typography variant="body2" color="primary">
                  <a href={user.website} target="_blank" rel="noopener noreferrer">
                    {user.website}
                  </a>
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Posts Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="POSTS" />
            <Tab label="SAVED" />
          </Tabs>
        </Paper>

        {/* Posts Grid */}
        {tabValue === 0 && (
          <Box>
            {posts.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No posts yet
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {posts.map((post) => (
                  <Grid item xs={12} sm={6} md={4} key={post._id}>
                    <Box
                      sx={{
                        position: 'relative',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                      }}
                      onClick={() => navigate(`/p/${post._id}`)}
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
                      {post.images.length > 1 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: 'white',
                          }}
                        >
                          📷
                        </Box>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Saved posts will appear here
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Profile;