// lib/store.ts
import { Room, BackendBooking, BookingSlot } from '@/types/room';

const API_BASE_URL = `${window.location.origin}/api`;

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`🌐 Fetching: ${url} with method ${options.method || 'GET'}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log(`📡 Response status: ${response.status} for ${url}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`❌ Fetch error for ${url}:`, error);
    throw error;
  }
};

// Helper to handle API errors consistently
const getErrorFromResponse = async (response: Response): Promise<string> => {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
        const errorData = await response.json();
        console.error('Backend Error Response Data:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
        console.error('Failed to parse error response as JSON:', e);
    }
    return errorMessage;
};

// Helper function to map BackendBooking (from database) to BookingSlot (for frontend calendar)
const mapBackendBookingToBookingSlot = (backendBooking: BackendBooking): BookingSlot => {
    return {
        id: backendBooking.event_id || backendBooking.id?.toString(),
        subject: backendBooking.subject,
        start: {
            dateTime: backendBooking.start_datetime,
            timeZone: 'Asia/Kolkata' 
        },
        end: {
            dateTime: backendBooking.end_datetime,   
            timeZone: 'Asia/Kolkata'
        },
        location: {
            displayName: backendBooking.room_name,
            locationEmailAddress: backendBooking.room_id ? `room${backendBooking.room_id}@example.com` : undefined
        },
        organizer: {
            emailAddress: {
                address: backendBooking.organizer_email,
            },
        },
        room_id: backendBooking.room_id,
        totalParticipants: backendBooking.total_participants,
        internalParticipants: backendBooking.internal_participants,
        externalParticipants: backendBooking.external_participants,
        meeting_type: backendBooking.meeting_type,
        attendee_emails: backendBooking.attendee_emails
    };
};


export const getRooms = async (): Promise<Room[]> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/rooms`);
        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }
        const rooms: Room[] = await response.json();
        console.log(`✅ Fetched ${rooms.length} rooms`);
        return rooms;
    } catch (error: any) {
        console.error('Error fetching rooms:', error);
        throw new Error(error.message || 'Failed to fetch rooms.');
    }
};

export const fetchBookingsByEmail = async (email: string): Promise<BookingSlot[]> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/by-email/${encodeURIComponent(email)}`);
        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }
        const result = await response.json();
        console.log(`✅ Fetched ${result.data.length} backend bookings for ${email}`);
        return Array.isArray(result.data) ? result.data.map(mapBackendBookingToBookingSlot) : [];
    } catch (error: any) {
        console.error('Error fetching bookings by email:', error);
        throw new Error(error.message || 'Failed to fetch bookings by email.');
    }
};

export const addBooking = async (bookingData: any): Promise<{ message: string }> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
        });
        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error: any) {
        console.error('Error adding booking:', error);
        throw new Error(error.message || 'Failed to add booking.');
    }
};

export const updateBooking = async (bookingData: any): Promise<{ message: string }> => {
    if (!bookingData.eventId) {
        throw new Error('Booking ID (eventId) is required to update a booking.');
    }
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingData.eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
        });
        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error: any) {
        console.error('Error updating booking:', error);
        throw new Error(error.message || 'Failed to update booking.');
    }
};

// --- OTP Functions (now correctly pointing to /api/otp routes) ---
export const sendOTP = async (email: string): Promise<{ message: string }> => {
    try {
        // Corrected endpoint to match your otpRoutes.js
        const response = await fetchWithTimeout(`${API_BASE_URL}/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error: any) {
        console.error('Error sending OTP:', error);
        throw new Error(error.message || 'Failed to send OTP.');
    }
};

export const verifyOTP = async (email: string, otp: string): Promise<{ message: string }> => {
    try {
        // Corrected endpoint to match your otpRoutes.js
        const response = await fetchWithTimeout(`${API_BASE_URL}/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });
        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }
        const result = await response.json();
        return result; 
    } catch (error: any) {
        console.error('Error verifying OTP:', error);
        throw new Error(error.message || 'Failed to verify OTP.');
    }
};

export const cancelBooking = async (bookingId: string, organizerEmail: string): Promise<{ message: string }> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/bookings/cancel/${bookingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizerEmail }),
        });

        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Booking cancelled successfully via API:', result);
        return result;
    } catch (error: any) {
        console.error('Error cancelling booking:', error);
        throw new Error(error.message || 'Failed to cancel booking.');
    }
};

export const fetchBookedSlots = async (roomId: string, date: string): Promise<BookingSlot[]> => {
    try {
        const url = `${API_BASE_URL}/bookings/events?roomId=${encodeURIComponent(roomId)}&startDate=${date}T00:00:00.000Z&endDate=${date}T23:59:59.999Z`;

        const response = await fetchWithTimeout(url);

        if (!response.ok) {
            const errorMessage = await getErrorFromResponse(response);
            throw new Error(errorMessage);
        }

        const data: BackendBooking[] = await response.json();
        console.log(`✅ Fetched ${data.length} raw backend bookings for room ID ${roomId} on ${date}`);
        
        return Array.isArray(data) ? data.map(mapBackendBookingToBookingSlot) : [];
    } catch (error) {
        console.error(`Error fetching booked slots for room ID ${roomId}:`, error);
        return [];
    }
};
