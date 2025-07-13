import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import moment from 'moment';

const CommentSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/comments/post/${postId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await axios.post('/comments', {
        postId,
        content: newComment,
      });
      setComments(prev => [response.data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={submitting}
          sx={{ mr: 1 }}
        />
        <Button
          type="submit"
          variant="text"
          disabled={!newComment.trim() || submitting}
          sx={{ minWidth: 'auto' }}
        >
          <Send />
        </Button>
      </Box>

      {comments.map((comment) => (
        <Box key={comment._id} sx={{ display: 'flex', mb: 1 }}>
          <Avatar
            src={comment.user.profilePicture}
            sx={{ width: 24, height: 24, mr: 1, mt: 0.5 }}
          >
            {comment.user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2">
              <Typography component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                {comment.user.username}
              </Typography>
              {comment.content}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {moment(comment.createdAt).fromNow()}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default CommentSection;