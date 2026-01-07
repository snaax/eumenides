const { pool } = require('../lib/database');

/**
 * Verify premium key and return user details
 * Vercel serverless function
 *
 * Query params:
 * - key: Premium key to verify
 */
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'key parameter required'
      });
    }

    // Get user from database by premium key
    const result = await pool.query(
      'SELECT email, premium_key, subscription_tier, premium_until, subscription_canceled FROM users WHERE premium_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: false,
        premium: false,
        error: 'Invalid or expired premium key'
      });
    }

    const user = result.rows[0];

    // Check if premium is still valid
    const now = new Date();
    const premiumUntil = new Date(user.premium_until);

    if (premiumUntil < now) {
      return res.status(200).json({
        success: false,
        premium: false,
        error: 'Premium subscription has expired'
      });
    }

    // Return premium details
    return res.status(200).json({
      success: true,
      premium: true,
      plan: user.subscription_tier,
      email: user.email,
      expiresAt: user.premium_until,
      subscriptionCanceled: user.subscription_canceled || false
    });

  } catch (error) {
    console.error('Error verifying premium key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify premium key'
    });
  }
};
