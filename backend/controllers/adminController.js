const { sendEmail } = require('../utils/emailService');
const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234'; 

const adminController = {
    dbPool: null,
    setDbPool: (pool) => { adminController.dbPool = pool; },

    // 1. Admin Login
    adminLogin: async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            return res.status(200).json({ success: true, message: 'Admin login successful.', token: 'simulated_admin_token' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        }
    },

    // 2. Get All Bookings (Admin View)
    getAllBookings: async (req, res) => {
        try {
            if (!adminController.dbPool) return res.status(500).json({ success: false, message: 'Database connection not available.' });
            
            const result = await adminController.dbPool.query('SELECT * FROM room_bookings ORDER BY created_at DESC');
            res.status(200).json({ success: true, data: result.rows, count: result.rowCount });
        } catch (error) {
            console.error('Error fetching all bookings (admin):', error);
            res.status(500).json({ success: false, message: 'Failed to fetch all bookings.' });
        }
    },

    // 3. Delete Booking (Transactional)
    deleteBooking: async (req, res) => {
        const { eventId } = req.params;
        if (!eventId) return res.status(400).json({ success: false, message: 'Event ID is required.' });

        const client = await adminController.dbPool.connect();
        try {
            await client.query('BEGIN');

            const checkQuery = `SELECT subject, room_name, start_datetime, end_datetime, organizer_email 
                                FROM room_bookings WHERE event_id = $1 AND status = 'confirmed'`;
            const checkResult = await client.query(checkQuery, [eventId]);
            const bookingToCancel = checkResult.rows[0];

            if (!bookingToCancel) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Booking not found or already cancelled.' });
            }

            const updateQuery = `UPDATE room_bookings 
                                 SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() 
                                 WHERE event_id = $1`;
            await client.query(updateQuery, [eventId]);

            await client.query('COMMIT');

            const html = `
                <p>Dear ${bookingToCancel.organizer_email.split('@')[0]},</p>
                <p>Your booking for <strong>${bookingToCancel.room_name}</strong> has been cancelled by the administrator.</p>
                <p>Time: ${new Date(bookingToCancel.start_datetime).toLocaleString()}</p>
            `;
            await sendEmail(bookingToCancel.organizer_email, `Booking Cancelled: ${bookingToCancel.subject}`, html);

            res.status(200).json({ success: true, message: 'Booking cancelled by admin successfully.' });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting booking by admin:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            client.release();
        }
    },

    // 4. Send Reschedule Email
    sendRescheduleEmail: async (req, res) => {
        const { bookingId, organizerEmail, subject, message } = req.body;
        if (!bookingId || !organizerEmail || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        try {
            const html = `
                <p>Regarding booking ID: ${bookingId}</p>
                <p><strong>Message from Admin:</strong></p>
                <div style="background:#f9f9f9; padding:15px; border:1px solid #ccc;">${message}</div>
                <p>Please contact us to reschedule.</p>
            `;
            await sendEmail(organizerEmail, `RE: ${subject}`, html);
            res.status(200).json({ success: true, message: 'Reschedule email sent.' });
        } catch (error) {
            console.error('Error sending reschedule email:', error);
            res.status(500).json({ success: false, message: 'Failed to send email.' });
        }
    },

    // 5. Create Booking (Admin Override)
    createBookingAdmin: async (req, res) => {
        const { room_id, room_name, subject, organizer_email, start_datetime, end_datetime, 
                total_participants, internal_participants, external_participants, meeting_type, 
                attendee_emails, location } = req.body;

        try {
            const event_id = crypto.randomUUID();
            const query = `
                INSERT INTO room_bookings (
                    event_id, room_id, room_name, subject, organizer_email, start_datetime, end_datetime, 
                    total_participants, internal_participants, external_participants, meeting_type, 
                    attendee_emails, status, created_at, location
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'confirmed', NOW(), $13)
            `;
            
            const values = [
                event_id, room_id, room_name, subject, organizer_email, start_datetime, end_datetime,
                total_participants, internal_participants, external_participants, meeting_type,
                JSON.stringify(attendee_emails || []), location
            ];

            await adminController.dbPool.query(query, values);
            
            await sendEmail(organizer_email, `Admin Booking: ${subject}`, `<p>An administrator has created a booking for you in ${room_name}.</p>`);

            res.status(201).json({ success: true, message: 'Booking created by admin.', event_id });
        } catch (error) {
            console.error('Error creating booking by admin:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = { adminController };