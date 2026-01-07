const { pool } = require('../lib/database');

/**
 * Activate premium by email - returns premium key if user exists
 * Vercel serverless function
 *
 * Query params:
 * - email: User email to look up
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
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'email parameter required'
      });
    }

    // Get user from database by email
    const result = await pool.query(
      'SELECT email, premium_key, subscription_tier, premium_until, subscription_canceled FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No active subscription found for this email'
      });
    }

    const user = result.rows[0];

    // Check if premium is still valid
    const now = new Date();
    const premiumUntil = new Date(user.premium_until);

    if (premiumUntil < now) {
      return res.status(200).json({
        success: false,
        error: 'Premium subscription has expired'
      });
    }

    // Return premium details
    return res.status(200).json({
      success: true,
      premiumKey: user.premium_key,
      plan: user.subscription_tier,
      email: user.email,
      expiresAt: user.premium_until,
      subscriptionCanceled: user.subscription_canceled || false
    });

  } catch (error) {
    console.error('Error activating by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to activate premium'
    });
  }
};
