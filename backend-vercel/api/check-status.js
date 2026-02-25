const { pool } = require('../lib/database');
const { validateEmail } = require('../lib/validators');

/**
 * Check premium status by email
 * Replaces the premium key verification system
 * Vercel serverless function
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
      'SELECT email, premium_until, subscription_tier, is_active, stripe_customer_id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        premium: false,
        reason: 'No subscription found'
      });
    }

    const user = result.rows[0];
    const isValid = new Date(user.premium_until) > new Date() && user.is_active;

    if (!isValid) {
      return res.status(200).json({
        premium: false,
        reason: user.is_active ? 'Subscription expired' : 'Subscription inactive'
      });
    }

    res.status(200).json({
      premium: true,
      email: user.email,
      expiresAt: user.premium_until,
      tier: user.subscription_tier || 'basic',
      stripeCustomerId: user.stripe_customer_id
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
