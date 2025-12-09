import { Room, BackendBooking, BookingSlot } from '@/types/room';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:5000/api';
const fetchJSON = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'API Error');
  }
  return data;
};

// --- 1. ROOMS ---
export const getRooms = async (): Promise<Room[]> => {
  return await fetchJSON(`${API_BASE_URL}/rooms`);
};

// --- 2. BOOKINGS ---

export const fetchBookedSlots = async (roomId: string, date: string): Promise<BookingSlot[]> => {
  const url = `${API_BASE_URL}/bookings/events?roomId=${roomId}&startDate=${date}`;
  const bookings: BackendBooking[] = await fetchJSON(url);

  return bookings.map((b) => ({
    id: b.event_id,
    subject: b.subject,
    start: { dateTime: b.start_datetime, timeZone: 'Asia/Kolkata' },
    end: { dateTime: b.end_datetime, timeZone: 'Asia/Kolkata' },
    organizer: { emailAddress: { address: b.organizer_email, name: 'Organizer' } },
    room_id: b.room_id.toString(),
  }));
};

// Create a new booking
export const addBooking = async (bookingData: any) => {
  const payload = {
    room_id: parseInt(bookingData.roomId),
    room_name: bookingData.roomName,
    subject: bookingData.subject,
    description: bookingData.description,
    organizer_email: bookingData.organizerEmail, 
    start_datetime: bookingData.start.toISOString(),
    end_datetime: bookingData.end.toISOString(),
    total_participants: bookingData.totalParticipants,
    internal_participants: bookingData.internalParticipants,
    external_participants: bookingData.externalParticipants,
    meeting_type: bookingData.meetingType,
    attendee_emails: bookingData.attendees,
    location: bookingData.location
  };

  return await fetchJSON(`${API_BASE_URL}/bookings/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Cancel Booking
export const cancelBooking = async (eventId: string, organizerEmail: string) => {
  return await fetchJSON(`${API_BASE_URL}/bookings/cancel/${eventId}`, {
    method: 'POST',
    body: JSON.stringify({ organizerEmail }),
  });
};

// Update/Reschedule Booking
export const updateBooking = async (eventId: string, updateData: any) => {
  const payload = {
    room_id: parseInt(updateData.roomId),
    subject: updateData.subject,
    organizer_email: updateData.organizerEmail,
    start_datetime: updateData.start.toISOString(),
    end_datetime: updateData.end.toISOString(),
    total_participants: updateData.totalParticipants,
    attendee_emails: updateData.attendees,
  };

  return await fetchJSON(`${API_BASE_URL}/bookings/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const fetchBookingsByEmail = async (email: string) => {
    return await fetchJSON(`${API_BASE_URL}/bookings/by-email/${email}`);
};


// --- 3. OTP (Resend) ---
export const sendOTP = async (email: string) => {
  return await fetchJSON(`${API_BASE_URL}/otp/send-otp`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const verifyOTP = async (email: string, otp: string) => {
  return await fetchJSON(`${API_BASE_URL}/otp/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
};