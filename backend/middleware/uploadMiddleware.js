const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Video types
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska' // .mkv
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, DOCX, and video files (MP4, WebM, OGG) are allowed.'), false);
  }
};

// Video file filter (for separate video upload endpoint)
const videoFilter = (req, file, cb) => {
  const videoTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ];

  if (videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid video type. Only MP4, WebM, and OGG are allowed.'), false);
  }
};

// Configure general upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 // 5MB default
  }
});

// Configure video upload (larger limit)
const videoUpload = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE) || 500 * 1024 * 1024 // 500MB default
  }
});

// Error handling middleware for multer
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    return res.status(400).json({ 
      message: err.message,
      error: 'MulterError'
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(400).json({ 
      message: err.message,
      error: 'UploadError'
    });
  }
  next();
};

module.exports = { upload, videoUpload, uploadErrorHandler };