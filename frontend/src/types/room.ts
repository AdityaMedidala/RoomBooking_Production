// src/types/room.ts
export interface Room {
  id: string; 
  name: string;
  capacity: number;
  features: string[];
  image?: string;
  location: string;
}

export interface BackendBooking {
  event_id: string; 
  room_id: number;
  room_name: string;
  subject: string;
  description?: string;
  organizer_email: string;
  start_datetime: string; // ISO String
  end_datetime: string;   // ISO String
  total_participants: number;
  internal_participants?: number;
  external_participants?: number;
  meeting_type?: 'in-person' | 'online' | 'hybrid';
  attendee_emails?: string; // Stored as JSON string in DB
  status: 'confirmed' | 'cancelled';
  location?: string;
}

export interface BookingSlot {
  id: string; // Mapped from event_id
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  room_id: string; 
  is_organizer?: boolean; // Helper for frontend UI
}