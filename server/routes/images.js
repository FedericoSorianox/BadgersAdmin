const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary config is assumed to be set via CLOUDINARY_URL env var or similar 
// If specific config is needed, we can add it here.
// However, the project seems to use 'cloudinary' package directly in package.json
// Let's ensure it's configured. Usually index.js or a config file does it.
// Checking previous specific file reads, I didn't see explicit config in index.js.
// But 'multer-storage-cloudinary' is in package.json.

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'tenants',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

// @route   POST api/images/upload
// @desc    Upload an image to Cloudinary
// @access  Public (or protected if needed, but often public for ease in this context unless strict)
router.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }
        res.json({ imageUrl: req.file.path });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;
