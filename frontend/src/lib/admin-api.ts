// lib/admin-api.ts
import { Room, BackendBooking } from '@/types/room';

const API_BASE_URL = `${window.location.origin}/api`;

// Re-usable fetch with timeout logic
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
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
        errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) { /* Could not parse JSON, use default message */ }
    return errorMessage;
};

// Helper to get authorization headers
const getAdminAuthHeader = (): { 'x-admin-auth': string } => {
    const token = localStorage.getItem('admin_token') || 'simulated_admin_token';
    return { 'x-admin-auth': token };
};


// --- BOOKING FUNCTIONS ---

export const getAllBookings = async (): Promise<BackendBooking[]> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/admin/bookings`, {
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        const result = await response.json();
        return result.data || result;
    } catch (error: any) {
        console.error('Error fetching all bookings:', error);
        throw new Error(error.message || 'Failed to fetch all bookings.');
    }
};

export const createBooking = async (booking: any): Promise<{ message: string }> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/admin/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
            body: JSON.stringify(booking),
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create booking.');
    }
};

export const deleteBookingAdmin = async (eventId: string): Promise<{ message: string }> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/admin/bookings/${eventId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to cancel booking.');
    }
};

export const sendRescheduleEmail = async (emailData: any): Promise<{ message: string }> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/admin/send-reschedule-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
            body: JSON.stringify(emailData),
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to send reschedule email.');
    }
};


// --- ROOM FUNCTIONS (CORRECTED) ---

export const getAllRooms = async (): Promise<Room[]> => {
    try {
        // This is a public endpoint as per your backend routes, so no auth header needed.
        const response = await fetchWithTimeout(`${API_BASE_URL}/rooms`);
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        console.error('Error fetching all rooms:', error);
        throw new Error(error.message || 'Failed to fetch all rooms.');
    }
};

export const createRoom = async (formData: FormData): Promise<{ message: string }> => {
    try {
        // Sends FormData, so DO NOT set Content-Type header. The browser does it automatically.
        const response = await fetchWithTimeout(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: getAdminAuthHeader(), // Only send auth header
            body: formData,
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        console.error('Error creating room:', error);
        throw new Error(error.message || 'Failed to create room.');
    }
};

export const updateRoom = async (id: number, formData: FormData): Promise<{ message: string }> => {
    try {
        // Also sends FormData for updates.
        const response = await fetchWithTimeout(`${API_BASE_URL}/rooms/${id}`, {
            method: 'PUT',
            headers: getAdminAuthHeader(), // Only send auth header
            body: formData,
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        console.error('Error updating room:', error);
        throw new Error(error.message || 'Failed to update room.');
    }
};

export const deleteRoom = async (id: number): Promise<{ message: string }> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        console.error('Error deleting room:', error);
        throw new Error(error.message || 'Failed to delete room.');
    }
};

// --- AUTH FUNCTIONS ---

export const adminLogin = async (loginData: { email: string; password: string }): Promise<any> => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData),
        });
        if (!response.ok) throw new Error(await getErrorFromResponse(response));
        return await response.json();
    } catch (error: any) {
        console.error('Error during admin login:', error);
        throw new Error(error.message || 'Failed to login.');
    }
};
