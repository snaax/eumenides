const { pool } = require('../lib/database');
const { validateEmail } = require('../lib/validators');

/**
 * Check premium status by email
 * Useful for customer support
 * Vercel serverless function (also works with Express when migrating to Railway)
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate input
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Query database
    const result = await pool.query(
      'SELECT email, premium_until, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ found: false });
    }

    const user = result.rows[0];
    const isValid = new Date(user.premium_until) > new Date();

    res.status(200).json({
      found: true,
      premium: isValid,
      expiresAt: user.premium_until,
      memberSince: user.created_at
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
