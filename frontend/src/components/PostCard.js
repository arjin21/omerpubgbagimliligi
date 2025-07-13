import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardMedia,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Send,
  BookmarkBorder,
  Bookmark,
  MoreVert,
  Delete,
  Edit,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import moment from 'moment';
import CommentSection from './CommentSection';

const PostCard = ({ post, onUpdate, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes.includes(user?._id));
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [showComments, setShowComments] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    caption: post.caption,
    location: post.location,
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState('');

  const isOwnPost = post.user._id === user?._id;

  const handleLike = async () => {
    try {
      if (liked) {
        await axios.delete(`/posts/${post._id}/like`);
        setLikesCount(prev => prev - 1);
      } else {
        await axios.post(`/posts/${post._id}/like`);
        setLikesCount(prev => prev + 1);
      }
      setLiked(!liked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`/posts/${post._id}/save`);
      // You can add a saved state here if needed
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/posts/${post._id}`);
      onDelete(post._id);
      setDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const handleEdit = async () => {
    try {
      const response = await axios.put(`/posts/${post._id}`, editData);
      onUpdate(response.data);
      setEditDialog(false);
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === post.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? post.images.length - 1 : prev - 1
    );
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%', mb: 2 }}>
        <CardHeader
          avatar={
            <Avatar
              src={post.user.profilePicture}
              onClick={() => navigate(`/${post.user.username}`)}
              sx={{ cursor: 'pointer' }}
            >
              {post.user.username.charAt(0).toUpperCase()}
            </Avatar>
          }
          action={
            isOwnPost && (
              <IconButton onClick={handleMenuOpen}>
                <MoreVert />
              </IconButton>
            )
          }
          title={
            <Typography
              variant="subtitle2"
              sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => navigate(`/${post.user.username}`)}
            >
              {post.user.username}
            </Typography>
          }
          subheader={
            <Typography variant="caption" color="text.secondary">
              {moment(post.createdAt).fromNow()}
            </Typography>
          }
        />

        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={post.images[currentImageIndex]}
            alt="Post"
            sx={{ height: 400, objectFit: 'cover' }}
          />
          
          {post.images.length > 1 && (
            <>
              <IconButton
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
                onClick={prevImage}
              >
                ‹
              </IconButton>
              <IconButton
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
                onClick={nextImage}
              >
                ›
              </IconButton>
              
              <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
                {post.images.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: index === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                      display: 'inline-block',
                      mx: 0.5,
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>

        <CardActions disableSpacing>
          <IconButton onClick={handleLike}>
            {liked ? <Favorite color="error" /> : <FavoriteBorder />}
          </IconButton>
          <IconButton onClick={() => setShowComments(!showComments)}>
            <ChatBubbleOutline />
          </IconButton>
          <IconButton>
            <Send />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={handleSave}>
            <BookmarkBorder />
          </IconButton>
        </CardActions>

        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {likesCount} likes
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            <Typography component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
              {post.user.username}
            </Typography>
            {post.caption}
          </Typography>

          {post.location && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              📍 {post.location}
            </Typography>
          )}

          {post.comments.length > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ cursor: 'pointer' }}
              onClick={() => setShowComments(!showComments)}
            >
              View all {post.comments.length} comments
            </Typography>
          )}

          {showComments && (
            <CommentSection postId={post._id} />
          )}
        </CardContent>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); setEditDialog(true); }}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setDeleteDialog(true); }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this post?</Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Caption"
            value={editData.caption}
            onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Location"
            value={editData.location}
            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PostCard;