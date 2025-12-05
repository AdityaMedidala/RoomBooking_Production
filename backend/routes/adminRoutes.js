const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers/adminController');

router.use((req, res, next) => {
  if (!adminController.dbPool) return res.status(500).json({ success: false, message: "DB not connected" });
  next();
});

router.post('/login', adminController.adminLogin);
router.get('/bookings', adminController.getAllBookings);
router.delete('/bookings/:eventId', adminController.deleteBooking);
router.post('/send-reschedule-email', adminController.sendRescheduleEmail);
router.post('/create-booking', adminController.createBookingAdmin);

module.exports = router;