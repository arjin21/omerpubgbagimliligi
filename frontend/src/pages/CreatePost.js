import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreatePost = () => {
  const [formData, setFormData] = useState({
    caption: '',
    location: '',
    tags: '',
  });
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    // Create preview URLs
    const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreview(previewUrls);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formDataToSend = new FormData();
      files.forEach(file => {
        formDataToSend.append('media', file);
      });
      formDataToSend.append('caption', formData.caption);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('tags', formData.tags);

      await axios.post('/posts', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 2 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Create New Post
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            {/* File Upload */}
            <Box sx={{ mb: 3 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{ mb: 2 }}
                >
                  Upload Images
                </Button>
              </label>
              
              {preview.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {preview.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Caption */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Caption"
              name="caption"
              value={formData.caption}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />

            {/* Location */}
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />

            {/* Tags */}
            <TextField
              fullWidth
              label="Tags (comma separated)"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., nature, photography, travel"
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || files.length === 0}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Post'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreatePost;