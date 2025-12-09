# Room Booking System (React + Node.js + Supabase + Railway + Vercel)

A full-stack room booking application with an admin dashboard, automated email workflows, room management, and a calendar-based scheduling interface. Built with a modern TypeScript stack and deployed across Vercel, Railway, Supabase, Resend, and Cloudinary.

## Live Demo
Frontend: https://room-booking-production-mlmp-fwi1lrdwd.vercel.app/

## Tech Stack
Frontend:React, TypeScript, Vite, Tailwind, shadcn/ui, FullCalendar  
Backend:Node.js, Express, TypeScript/JS, Supabase PostgreSQL, Resend (email), Cloudinary (room images)  
Deployment:Railway (backend), Vercel (frontend)

 ## Key Features
- Admin dashboard with FullCalendar (month/week/day views), custom event rendering, and booking management  
- Room CRUD operations with Cloudinary-based image upload and multi-location grouping  
- Automated and manual email workflows using Resend (confirmation, cancellation, reschedule)  
- Transactional bookings with PostgreSQL(Supabase) and admin override  
- Secure admin login, historical booking archive, and searchable booking history

## 📂 Project Structure

Here is the overview of the codebase organization:

```
backend/
├── config/
├── controllers/
│   ├── adminController.js
│   ├── bookingController.js
│   ├── otpController.js
│   └── roomController.js
├── public/dist/        # Static assets
├── routes/
│   ├── adminRoutes.js
│   ├── bookingroutes.js
│   ├── otpRoutes.js
│   └── roomRoutes.js
├── utils/
│   └── emailService.js
├── server.js
└── package.json

frontend/
├── public/             # Images, icons
├── src/
│   ├── components/
│   │   ├── ui/         # Shadcn components
│   │   ├── AdminPanel.jsx
│   │   ├── BookingForm.tsx
│   │   ├── ManageBooking.tsx
│   │   └── RoomCard.tsx
│   ├── lib/
│   │   ├── admin-api.ts
│   │   ├── store.ts    # State management
│   │   └── utils.ts
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json
```

## Installation & Setup

1. Backend Setup
Navigate to the backend directory:
```
cd backend
npm install
```
Create a .env file in the backend folder and add these environment variables:
```
# Server Configuration
PORT=5000

# Database (Supabase PostgreSQL)
DATABASE_URL=

# Resend Email Service
RESEND_API_KEY=
SENDER_EMAIL=

# Admin Authentication (for Admin Panel login)
ADMIN_EMAIL=
ADMIN_PASSWORD="1234"
```
Start the server:
```
npm start or npm run dev
```
2. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```
cd frontend
npm install

```
## Deployment
- Backend: Railway  
- Frontend: Vercel  
- Database: Supabase PostgreSQL  
- Images: Cloudinary  
- Email: Resend

# Contact
For any queries or contributions, feel free to open an issue or submit a PR.



