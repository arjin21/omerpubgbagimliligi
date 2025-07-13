const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    // Create subdirectories based on file type
    if (file.fieldname === 'profilePicture') {
      uploadPath = path.join(uploadsDir, 'profiles');
    } else if (file.fieldname === 'postImage' || file.fieldname === 'postVideo') {
      uploadPath = path.join(uploadsDir, 'posts');
    } else if (file.fieldname === 'storyImage' || file.fieldname === 'storyVideo') {
      uploadPath = path.join(uploadsDir, 'stories');
    } else if (file.fieldname === 'messageMedia') {
      uploadPath = path.join(uploadsDir, 'messages');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Specific upload configurations
const uploadProfilePicture = upload.single('profilePicture');
const uploadPostMedia = upload.array('postMedia', 10); // Max 10 images/videos per post
const uploadStoryMedia = upload.single('storyMedia');
const uploadMessageMedia = upload.single('messageMedia');

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field.' });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({ message: 'File upload failed.' });
};

// Validation middleware for different upload types
const validateProfilePicture = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Profile picture is required.' });
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Only image files are allowed for profile pictures.' });
  }
  
  // Check file size (max 5MB for profile pictures)
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ message: 'Profile picture must be less than 5MB.' });
  }
  
  next();
};

const validatePostMedia = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'At least one media file is required.' });
  }
  
  if (req.files.length > 10) {
    return res.status(400).json({ message: 'Maximum 10 files allowed per post.' });
  }
  
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  
  for (const file of req.files) {
    if (!allowedImageTypes.includes(file.mimetype) && !allowedVideoTypes.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only images and videos are allowed.' });
    }
    
    // Check file size (max 50MB per file)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ message: 'Each file must be less than 50MB.' });
    }
  }
  
  next();
};

const validateStoryMedia = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Story media is required.' });
  }
  
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  
  if (!allowedImageTypes.includes(req.file.mimetype) && !allowedVideoTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Invalid file type. Only images and videos are allowed.' });
  }
  
  // Check file size (max 30MB for stories)
  if (req.file.size > 30 * 1024 * 1024) {
    return res.status(400).json({ message: 'Story media must be less than 30MB.' });
  }
  
  next();
};

const validateMessageMedia = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Message media is required.' });
  }
  
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  const allowedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
  
  if (!allowedImageTypes.includes(req.file.mimetype) && 
      !allowedVideoTypes.includes(req.file.mimetype) && 
      !allowedAudioTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Invalid file type. Only images, videos, and audio files are allowed.' });
  }
  
  // Check file size (max 25MB for messages)
  if (req.file.size > 25 * 1024 * 1024) {
    return res.status(400).json({ message: 'Message media must be less than 25MB.' });
  }
  
  next();
};

// Helper function to get file URL
const getFileUrl = (filename, type = 'posts') => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${type}/${filename}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file info
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: getFileUrl(file.filename, file.fieldname.replace('Image', '').replace('Video', ''))
  };
};

module.exports = {
  upload,
  uploadProfilePicture,
  uploadPostMedia,
  uploadStoryMedia,
  uploadMessageMedia,
  handleUploadError,
  validateProfilePicture,
  validatePostMedia,
  validateStoryMedia,
  validateMessageMedia,
  getFileUrl,
  deleteFile,
  getFileInfo
};