const express = require('express');
const router = express.Router();
const { bookingController } = require('../controllers/bookingController');

const ensureDbPool = (req, res, next) => {
  if (!bookingController.dbPool) return res.status(500).json({ success: false, message: "DB not connected" });
  next();
};

router.use(ensureDbPool);
router.get('/', bookingController.getAllBookings);
router.get('/events', bookingController.getBookingsByRoomAndDate);
router.get('/by-email/:email', bookingController.getBookingsByEmail);
router.post('/create', bookingController.createBooking);
router.post('/cancel/:eventId', bookingController.cancelBooking);
router.put('/:eventId', bookingController.updateBooking);

module.exports = router;