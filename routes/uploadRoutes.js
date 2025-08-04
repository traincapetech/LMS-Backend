const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Check if uploads directory exists, create if not
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Saving file to uploads directory');
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});
const upload = multer({ storage });

// Test route to check if uploads are working
router.get('/test', (req, res) => {
  res.json({ message: 'Upload route is working', uploadsDir: uploadsDir });
});

router.post('/thumbnail', upload.single('thumbnail'), (req, res) => {
  console.log('Upload request received');
  console.log('File:', req.file);
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  // Return the full URL for the uploaded image
          const imageUrl = `https://lms-backend-5s5x.onrender.com/uploads/${req.file.filename}`;
  console.log('Returning image URL:', imageUrl);
  res.json({ url: imageUrl });
});

module.exports = router; 