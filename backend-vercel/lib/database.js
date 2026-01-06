const { Pool } = require('pg');

// Create connection pool (works on Vercel serverless and Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase and most cloud providers
  },
  // Optimized for serverless (Vercel)
  // For Railway, these limits will be fine too
  max: 1, // 1 connection per serverless function instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Graceful shutdown (useful when migrating to Railway)
process.on('SIGTERM', async () => {
  await pool.end();
});

module.exports = { pool };
