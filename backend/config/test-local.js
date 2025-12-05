// Run this with: node test-local.js
const fetch = require('node-fetch'); // You might need to install: npm install node-fetch

const BASE_URL = 'http://localhost:5000/api';
const MY_EMAIL = 'your_email@gmail.com'; // CHANGE THIS to your real email to check Resend

async function runTests() {
  console.log('🚀 Starting Local Backend Tests...\n');

  // 1. Test Admin Login
  console.log('1️⃣  Testing Admin Login...');
  const login = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: '1234' })
  });
  const loginData = await login.json();
  if (loginData.success) console.log('   ✅ Login Success');
  else console.log('   ❌ Login Failed:', loginData);

  // 2. Test Create Room (Admin)
  console.log('\n2️⃣  Testing Create Room...');
  const room = await fetch(`${BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'x-admin-auth': 'simulated_admin_token' // Hardcoded token from your routes
    },
    body: JSON.stringify({
      name: "Test Room 1",
      capacity: 10,
      location: "Building A",
      features: "WiFi, TV"
    })
  });
  const roomData = await room.json();
  const roomId = roomData.room?.id;
  if (roomId) console.log(`   ✅ Room Created: ID ${roomId}`);
  else console.log('   ❌ Room Creation Failed:', roomData);

  // 3. Test Booking (DB + Email)
  if (roomId) {
    console.log('\n3️⃣  Testing Booking & Email...');
    const booking = await fetch(`${BASE_URL}/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        subject: "Integration Test",
        description: "Testing Supabase and Resend",
        organizer_email: MY_EMAIL,
        start_datetime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_datetime: new Date(Date.now() + 90000000).toISOString(),   // Tomorrow + 1hr
        total_participants: 5,
        room_name: "Test Room 1",
        location: "Building A"
      })
    });
    const bookingData = await booking.json();
    if (bookingData.success) {
      console.log('   ✅ Booking Created in DB');
      console.log(`   ✉️  CHECK YOUR EMAIL (${MY_EMAIL}) for confirmation!`);
    } else {
      console.log('   ❌ Booking Failed:', bookingData);
    }
  }

  console.log('\n🏁 Tests Finished.');
}

runTests();
