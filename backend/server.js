const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database'); 

const { roomController } = require('./controllers/roomController');
const { bookingController } = require('./controllers/bookingController');
const { otpController } = require('./controllers/otpController');
const { adminController } = require('./controllers/adminController');

const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingroutes'); 
const otpRoutes = require('./routes/otpRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const startServer = async () => {
  try {
    const pool = await connectDB();
    
    roomController.setDbPool(pool);
    bookingController.setDbPool(pool);
    otpController.setDbPool(pool);
    adminController.setDbPool(pool);

    console.log("------------------------------------------------");
    console.log("Type of roomRoutes:", typeof roomRoutes, roomRoutes?.name || "Is Object");
    console.log("Type of bookingRoutes:", typeof bookingRoutes, bookingRoutes?.name || "Is Object");
    console.log("Type of otpRoutes:", typeof otpRoutes, otpRoutes?.name || "Is Object");
    console.log("Type of adminRoutes:", typeof adminRoutes, adminRoutes?.name || "Is Object");
    console.log("------------------------------------------------");

    // Routes
    app.use('/api/rooms', roomRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/otp', otpRoutes);
    app.use('/api/admin', adminRoutes);

    app.get('*', (req, res) => {
        if (req.originalUrl.startsWith('/api')) return res.status(404).json({ message: 'API Route not found' });
        const index = path.join(__dirname, 'public', 'dist', 'index.html');
        if (fs.existsSync(index)) res.sendFile(index);
        else res.send('Backend running. Frontend build not found.');
    });

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();