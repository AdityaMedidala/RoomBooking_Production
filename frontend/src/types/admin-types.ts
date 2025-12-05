// types/admin-types.ts

export interface BackendBooking {
    id: number; // Assuming primary key 'id' in DB is number
    event_id: string;
    room_id: string; // Changed back to string
    room_name: string;
    subject: string;
    description?: string;
    organizer_email: string;
    start_datetime: string; // ISO string format
    end_datetime: string; // ISO string format
    total_participants: number;
    internal_participants: number;
    external_participants: number;
    meeting_type: 'online' | 'in-person' | 'hybrid';
    attendee_emails: string; // JSON string array
    status: 'confirmed' | 'cancelled' | 'pending';
    created_at: string; // ISO string format
    updated_at: string; // ISO string format
    cancelled_at?: string; // ISO string format
}

export interface CreateBookingRequest {
    room_id: string; // Changed back to string
    room_name: string;
    subject: string;
    description?: string;
    organizer_email: string;
    start_datetime: string;
    end_datetime: string;
    total_participants: number;
    internal_participants: number;
    external_participants: number;
    meeting_type: 'online' | 'in-person' | 'hybrid';
    attendee_emails: string; // JSON string array
}

export interface BookingResponse {
    message: string;
    data?: BackendBooking;
}

export interface BookingsListResponse {
    count: number;
    data: BackendBooking[];
}

export interface EmailRequest {
    bookingId: string; // Assuming bookingId passed here is the event_id or string primary key
    organizerEmail: string;
    subject: string;
    message: string;
}

export interface AdminLoginRequest {
    email: string;
    password: string;
}
