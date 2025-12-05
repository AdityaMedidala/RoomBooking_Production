// backend/routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { roomController } = require('../controllers/roomController');

// 1. Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'meeting-rooms', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

// 3. Routes (No changes needed to controller calls)
router.get('/', roomController.getAllRooms);
router.post('/', upload.single('image'), roomController.createRoom);
router.put('/:id', upload.single('image'), roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;