const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { roomController } = require('../controllers/roomController');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', roomController.getAllRooms);
router.post('/', upload.single('image'), roomController.createRoom);
router.put('/:id', upload.single('image'), roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;