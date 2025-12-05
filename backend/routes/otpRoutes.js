const express = require('express');
const router = express.Router();
const { otpController } = require('../controllers/otpController');

router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);
router.delete('/cleanup', otpController.cleanupExpiredOtps);

module.exports = router;