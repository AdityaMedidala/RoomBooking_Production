// types/room.ts

/**
 * Interface for Room data, typically from a static source or a backend 'rooms' endpoint.
 */
export interface Room {
  id: string; // Corresponds to backend's room_id (e.g., '1', '2', '3')
  name: string;
  location: string; // <-- ADD THIS LINE
  capacity: number;
  features?: string[];
  image?: string;
  emailAddress: string; // This is the *room's* email address, distinct from room_id
}

/**
 * Interface for Booking data as it's typically stored in or retrieved from the backend database.
 * Matches the 'room_bookings' SQL table structure in server.js after removing room_email.
 */
export interface BackendBooking {
  id?: number; // Primary key, auto-incremented
  event_id?: string; // UNIQUE identifier for the booking (e.g., from an external calendar service)
  room_id: string; // Foreign key linking to the 'rooms' table
  room_name: string;
  // room_email: string; // <-- REMOVED THIS LINE
  organizer_email: string;
  subject: string;
  description?: string;
  start_datetime: string; // ISO 8601 string (e.g., '2023-10-27T10:00:00')
  end_datetime: string; // ISO 8601 string
  total_participants: number;
  internal_participants?: number;
  external_participants?: number;
  meeting_type?: 'offline' | 'online' | 'hybrid'; // Added hybrid for more flexibility
  attendee_emails?: string; // Stored as NTEXT, assumed to be a JSON string or comma-separated list of emails
  status?: string; // e.g., 'confirmed', 'pending', 'cancelled'
  created_at?: string; // DATETIME
  updated_at?: string; // DATETIME
  cancelled_at?: string; // ISO string format - ADD THIS LINE
}

/**
 * Interface for a Booking Slot, representing a booked period,
 * often formatted to be compatible with frontend calendar components (e.g., MS Graph API event-like structure).
 * This is the format the frontend UI expects for displaying booked times.
 */
export interface BookingSlot {
  id?: string; // Usually corresponds to event_id or primary key from BackendBooking
  subject?: string;
  start: {
    dateTime: string; // ISO 8601 string (e.g., '2023-10-27T10:00:00.000Z')
    timeZone: string; // e.g., 'Asia/Kolkata'
  };
  end: {
    dateTime: string; // ISO 8601 string
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'Required' | 'Optional' | 'Resource'; // Type of attendee (e.g., organizer, resource, required)
  }>;
  location?: {
    displayName: string;
    locationEmailAddress?: string; // This can remain optional, as it might not be populated now
  };
  organizer?: { // Added organizer to BookingSlot for consistency
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  room_id?: string; // <--- IMPORTANT: This carries the room_id from BackendBooking
  // Add other fields that might be used for updating a booking, which come from BackendBooking
  totalParticipants?: number;
  internalParticipants?: number;
  externalParticipants?: number;
  meeting_type?: 'offline' | 'online' | 'hybrid';
  attendee_emails?: string; // Store as JSON string or comma-separated list of emails
  // If you need the original DB `id` (number) in frontend for some reason, add it here.
  // E.g., db_id?: number;
}