// config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/Railway
  },
  max: 10, // Max clients in the pool
  idleTimeoutMillis: 30000
});

// --- CRITICAL FIX: STOP SERVER CRASHES ---
// This catches network glitches so the server stays alive
pool.on('error', (err, client) => {
  console.error('⚠️ Unexpected error on idle database client', err);
  // Do NOT exit the process here. Just log it.
});
// -----------------------------------------

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // process.exit(1); // Optional: You might not want to kill the server even on initial fail
  }
};

module.exports = { connectDB, pool };