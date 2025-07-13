import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Avatar,
  Typography,
  LinearProgress,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const StoryViewer = ({ open, onClose, stories, currentStoryIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(currentStoryIndex);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const progressInterval = useRef(null);
  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (open && currentStory) {
      startProgress();
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [open, currentIndex, currentStory]);

  const startProgress = () => {
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 1;
      });
    }, 50); // 5 seconds total duration
  };

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    onClose();
  };

  const handleStoryClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 3) {
      prevStory();
    } else if (x > (width * 2) / 3) {
      nextStory();
    }
  };

  if (!currentStory) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          backgroundColor: 'black',
          boxShadow: 'none',
          borderRadius: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Progress Bars */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {stories.map((_, index) => (
              <Box key={index} sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={index < currentIndex ? 100 : index === currentIndex ? progress : 0}
                  sx={{
                    height: 2,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 'white',
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Header */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={currentStory.user.profilePicture}
              sx={{ width: 32, height: 32, cursor: 'pointer' }}
              onClick={() => navigate(`/${currentStory.user.username}`)}
            >
              {currentStory.user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => navigate(`/${currentStory.user.username}`)}
              >
                {currentStory.user.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {moment(currentStory.createdAt).fromNow()}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Story Content */}
        <Box
          onClick={handleStoryClick}
          sx={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <img
            src={currentStory.media}
            alt="Story"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Navigation Buttons */}
        <IconButton
          onClick={prevStory}
          disabled={currentIndex === 0}
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.3)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
            '&.Mui-disabled': { opacity: 0.3 },
          }}
        >
          <PrevIcon />
        </IconButton>

        <IconButton
          onClick={nextStory}
          disabled={currentIndex === stories.length - 1}
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.3)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
            '&.Mui-disabled': { opacity: 0.3 },
          }}
        >
          <NextIcon />
        </IconButton>

        {/* Story Caption */}
        {currentStory.caption && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            }}
          >
            <Typography variant="body2" sx={{ color: 'white' }}>
              {currentStory.caption}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;