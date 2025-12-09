const API = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:5000/api';
  
  const ADMIN_AUTH = { 'x-admin-auth': 'simulated_admin_token' };

const adminFetch = async (endpoint: string, opts: RequestInit = {}) => {
  const res = await fetch(`${API}${endpoint}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...ADMIN_AUTH, ...opts.headers },
  });
  if (!res.ok) throw new Error('Admin API Error');
  return res.json();
};

// --- AUTH ---
export const adminLogin = (data: any) => adminFetch('/admin/login', { method: 'POST', body: JSON.stringify(data) });

// --- BOOKINGS ---
export const getAllBookings = () => adminFetch('/admin/bookings').then(res => res.data);

export const deleteBookingAdmin = (id: string) => adminFetch(`/admin/bookings/${id}`, { method: 'DELETE' });

export const sendRescheduleEmail = (data: any) => adminFetch('/admin/send-reschedule-email', { method: 'POST', body: JSON.stringify(data) });

export const createBooking = (data: any) => adminFetch('/admin/create-booking', {
  method: 'POST',
  body: JSON.stringify(data)
});

// --- ROOMS ---
export const getAllRooms = () => adminFetch('/rooms');

export const createRoom = (formData: FormData) => fetch(`${API}/rooms`, {
  method: 'POST',
  headers: ADMIN_AUTH, 
  body: formData
}).then(r => r.json());

export const updateRoom = (id: number, formData: FormData) => fetch(`${API}/rooms/${id}`, {
  method: 'PUT',
  headers: ADMIN_AUTH,
  body: formData
}).then(r => r.json());

export const deleteRoom = (id: number) => adminFetch(`/rooms/${id}`, { method: 'DELETE' });
