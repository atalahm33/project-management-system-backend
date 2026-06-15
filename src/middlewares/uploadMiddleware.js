const multer = require('multer');
const AppError = require('../utils/AppError');
const path = require('path');
const fs = require('fs');

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/contracts');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // contract-timestamp-random.ext
    const ext = path.extname(file.originalname);
    cb(null, `contract-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

// Check file type
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit per file
  }
});

// Export middleware to upload multiple images (max 10)
exports.uploadContractImages = upload.array('images', 10);
