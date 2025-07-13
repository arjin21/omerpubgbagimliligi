import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Slider,
  Paper,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  TextFields as TextIcon,
  Palette as PaletteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const CreateStory = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [textOverlay, setTextOverlay] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    multiple: false,
  });

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('caption', caption);
      formData.append('textOverlay', textOverlay);
      formData.append('textColor', textColor);
      formData.append('textSize', textSize);
      formData.append('textPosition', JSON.stringify(textPosition));

      const response = await axios.post('/stories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess(response.data);
      handleClose();
    } catch (error) {
      console.error('Error creating story:', error);
      setError('Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setTextOverlay('');
    setTextColor('#ffffff');
    setTextSize(24);
    setTextPosition({ x: 50, y: 50 });
    setError('');
    onClose();
  };

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Create Story</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Preview Area */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                width: '100%',
                height: 400,
                border: '2px dashed #ccc',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
              }}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              {preview ? (
                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {textOverlay && (
                    <Typography
                      variant="h6"
                      sx={{
                        position: 'absolute',
                        left: `${textPosition.x}%`,
                        top: `${textPosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        color: textColor,
                        fontSize: textSize,
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        cursor: 'move',
                        userSelect: 'none',
                      }}
                    >
                      {textOverlay}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supports: JPG, PNG, GIF, MP4
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Controls */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Caption */}
              <TextField
                fullWidth
                label="Caption"
                multiline
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption to your story..."
              />

              {/* Text Overlay */}
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TextIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">Text Overlay</Typography>
                </Box>
                <TextField
                  fullWidth
                  label="Text"
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="Add text to your story..."
                  sx={{ mb: 2 }}
                />

                {/* Text Color */}
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  Text Color
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {colors.map((color) => (
                    <Box
                      key={color}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: textColor === color ? '2px solid #000' : '1px solid #ccc',
                        cursor: 'pointer',
                      }}
                      onClick={() => setTextColor(color)}
                    />
                  ))}
                </Box>

                {/* Text Size */}
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  Text Size: {textSize}px
                </Typography>
                <Slider
                  value={textSize}
                  onChange={(_, value) => setTextSize(value)}
                  min={12}
                  max={72}
                  step={2}
                  sx={{ mb: 2 }}
                />

                {/* Text Position */}
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  Text Position
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption">X: {textPosition.x}%</Typography>
                    <Slider
                      value={textPosition.x}
                      onChange={(_, value) => setTextPosition(prev => ({ ...prev, x: value }))}
                      min={0}
                      max={100}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption">Y: {textPosition.y}%</Typography>
                    <Slider
                      value={textPosition.y}
                      onChange={(_, value) => setTextPosition(prev => ({ ...prev, y: value }))}
                      min={0}
                      max={100}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedFile || loading}
          startIcon={<SaveIcon />}
        >
          {loading ? 'Creating...' : 'Create Story'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateStory;