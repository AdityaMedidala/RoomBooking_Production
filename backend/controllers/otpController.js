const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');

const otpController = {
  dbPool: null,
  setDbPool: (pool) => { otpController.dbPool = pool; },

  sendOtp: async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    try {
      const query = `
        INSERT INTO otp_storage (email, otp, expires_at, created_at, is_verified)
        VALUES ($1, $2, $3, NOW(), false)
        ON CONFLICT (email) 
        DO UPDATE SET otp = $2, expires_at = $3, created_at = NOW(), is_verified = false
      `;
      await otpController.dbPool.query(query, [email, otp, expiresAt]);

      await sendEmail(email, 'Your Verification Code', `<p>Code: <strong>${otp}</strong></p>`);
      
      res.status(200).json({ success: true, message: 'OTP sent' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  },

  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;
    try {
      const result = await otpController.dbPool.query('SELECT * FROM otp_storage WHERE email = $1', [email]);
      if (result.rowCount === 0) return res.status(400).json({ success: false, message: 'No OTP found' });

      const record = result.rows[0];
      if (new Date() > new Date(record.expires_at)) return res.status(400).json({ success: false, message: 'OTP expired' });
      if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

      await otpController.dbPool.query('UPDATE otp_storage SET is_verified = true WHERE email = $1', [email]);
      res.status(200).json({ success: true, message: 'Verified' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Verification failed' });
    }
  },

  cleanupExpiredOtps: async (req, res) => {
    try {
      await otpController.dbPool.query('DELETE FROM otp_storage WHERE expires_at < NOW()');
      res.status(200).json({ success: true, message: 'Cleaned up' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Cleanup failed' });
    }
  }
};

module.exports = { otpController };