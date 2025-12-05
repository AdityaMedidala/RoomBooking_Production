const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');

const bookingController = {
  dbPool: null,
  setDbPool: (pool) => { bookingController.dbPool = pool; },

  // 1. Get All Bookings
  getAllBookings: async (req, res) => {
    try {
      const result = await bookingController.dbPool.query('SELECT * FROM room_bookings ORDER BY start_datetime DESC');
      res.status(200).json({ success: true, data: result.rows, count: result.rowCount });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
    }
  },

  // 2. Get Bookings by Room & Date
  getBookingsByRoomAndDate: async (req, res) => {
    const { roomId, startDate } = req.query;
    if (!roomId || !startDate) return res.status(400).json({ success: false, message: 'Room ID and date required.' });

    try {
      const dateOnly = startDate.split('T')[0];
      // Note: Postgres works well with ISO strings, but explicit casting ensures safety
      const query = `
        SELECT event_id, room_id, room_name, subject, organizer_email, start_datetime, end_datetime, status 
        FROM room_bookings
        WHERE room_id = $1 
        AND status = 'confirmed'
        AND start_datetime >= $2::timestamptz 
        AND start_datetime <= $3::timestamptz
        ORDER BY start_datetime ASC
      `;
      // Start and End of the specific day
      const startOfDay = `${dateOnly}T00:00:00.000Z`;
      const endOfDay = `${dateOnly}T23:59:59.999Z`;

      const result = await bookingController.dbPool.query(query, [roomId, startOfDay, endOfDay]);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching room availability:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch availability.' });
    }
  },

  // 3. Get Bookings by Email
  getBookingsByEmail: async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    try {
      const result = await bookingController.dbPool.query(
        "SELECT * FROM room_bookings WHERE organizer_email = $1 AND status = 'confirmed' ORDER BY start_datetime ASC", 
        [email]
      );
      res.status(200).json({ success: true, data: result.rows, count: result.rowCount });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }
  },

  // 4. Create Booking
  createBooking: async (req, res) => {
    const client = await bookingController.dbPool.connect();
    try {
      const { room_id, subject, description, start_datetime, end_datetime, 
              total_participants, internal_participants, external_participants, 
              meeting_type, attendee_emails, organizer_email, room_name, location } = req.body;

      await client.query('BEGIN');

      // Check Room Capacity
      const roomCheck = await client.query('SELECT capacity FROM rooms WHERE id = $1', [room_id]);
      if (roomCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }
      if (total_participants > roomCheck.rows[0].capacity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Exceeds room capacity.' });
      }

      // Check Availability (Overlap)
      const startUtc = new Date(start_datetime);
      const endUtc = new Date(end_datetime);
      const availQuery = `
        SELECT count(*) as count FROM room_bookings 
        WHERE room_id = $1 AND status = 'confirmed'
        AND (start_datetime < $2 AND end_datetime > $3)
      `;
      const availResult = await client.query(availQuery, [room_id, endUtc, startUtc]);
      
      if (parseInt(availResult.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Room already booked.' });
      }

      // Insert
      const event_id = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO room_bookings (
          event_id, room_id, room_name, subject, description, organizer_email,
          start_datetime, end_datetime, total_participants, internal_participants,
          external_participants, meeting_type, attendee_emails, status, created_at, location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'confirmed', NOW(), $14)
      `;
      
      const values = [
        event_id, room_id, room_name, subject, description, organizer_email,
        startUtc, endUtc, total_participants, internal_participants,
        external_participants, meeting_type, JSON.stringify(attendee_emails || []), location
      ];

      await client.query(insertQuery, values);
      await client.query('COMMIT');

      // Send Email
      const emailHtml = `
        <h3>Booking Confirmed</h3>
        <p><strong>Room:</strong> ${room_name}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Time:</strong> ${startUtc.toLocaleString()} - ${endUtc.toLocaleString()}</p>
      `;
      await sendEmail(organizer_email, `Booking Confirmed: ${subject}`, emailHtml);

      res.status(201).json({ success: true, message: 'Booking created', event_id });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating booking:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  },

  // 5. Update Booking
  updateBooking: async (req, res) => {
    const { eventId } = req.params;
    const client = await bookingController.dbPool.connect();
    
    try {
      const { room_id, subject, description, organizer_email, start_datetime, end_datetime, 
              total_participants, internal_participants, external_participants, 
              meeting_type, attendee_emails } = req.body;

      await client.query('BEGIN');

      // Verify Existing Booking
      const existCheck = await client.query("SELECT * FROM room_bookings WHERE event_id = $1 AND status = 'confirmed'", [eventId]);
      if (existCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      // Check New Room Details
      const roomCheck = await client.query('SELECT capacity, name, location FROM rooms WHERE id = $1', [room_id]);
      if (roomCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'New room not found.' });
      }
      const { capacity, name: newRoomName, location: newLocation } = roomCheck.rows[0];

      if (total_participants > capacity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Exceeds room capacity.' });
      }

      // Check Overlap (excluding current event)
      const startUtc = new Date(start_datetime);
      const endUtc = new Date(end_datetime);
      const availQuery = `
        SELECT count(*) as count FROM room_bookings 
        WHERE room_id = $1 AND status = 'confirmed' AND event_id != $2
        AND (start_datetime < $3 AND end_datetime > $4)
      `;
      const availResult = await client.query(availQuery, [room_id, eventId, endUtc, startUtc]);
      
      if (parseInt(availResult.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Conflict detected.' });
      }

      // Update
      const updateQuery = `
        UPDATE room_bookings SET
          room_id = $1, room_name = $2, subject = $3, description = $4,
          organizer_email = $5, start_datetime = $6, end_datetime = $7,
          total_participants = $8, internal_participants = $9, external_participants = $10,
          meeting_type = $11, attendee_emails = $12, location = $13, updated_at = NOW()
        WHERE event_id = $14
      `;
      
      const values = [
        room_id, newRoomName, subject, description, organizer_email,
        startUtc, endUtc, total_participants, internal_participants, external_participants,
        meeting_type, JSON.stringify(attendee_emails || []), newLocation, eventId
      ];

      await client.query(updateQuery, values);
      await client.query('COMMIT');

      // Email
      const html = `<p>Your booking has been rescheduled to <strong>${newRoomName}</strong> at ${startUtc.toLocaleString()}.</p>`;
      await sendEmail(organizer_email, `Booking Rescheduled: ${subject}`, html);

      res.status(200).json({ success: true, message: 'Booking updated' });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating booking:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  },

  // 6. Cancel Booking (User Action)
  cancelBooking: async (req, res) => {
    const { eventId } = req.params;
    const { organizerEmail } = req.body;
    const client = await bookingController.dbPool.connect();

    try {
      await client.query('BEGIN');

      const checkQuery = "SELECT * FROM room_bookings WHERE event_id = $1 AND organizer_email = $2 AND status = 'confirmed'";
      const checkResult = await client.query(checkQuery, [eventId, organizerEmail]);

      if (checkResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Booking not found or permission denied.' });
      }
      const booking = checkResult.rows[0];

      await client.query("UPDATE room_bookings SET status = 'cancelled', cancelled_at = NOW() WHERE event_id = $1", [eventId]);
      await client.query('COMMIT');

      // Email
      await sendEmail(organizerEmail, `Cancelled: ${booking.subject}`, `<p>Your booking for ${booking.room_name} is cancelled.</p>`);

      res.status(200).json({ success: true, message: 'Booking cancelled' });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cancelling:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel.' });
    } finally {
      client.release();
    }
  }
};

module.exports = { bookingController };