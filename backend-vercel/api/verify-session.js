const { stripe } = require('../lib/stripe');
const { pool } = require('../lib/database');

/**
 * Verify Stripe checkout session and return premium details
 * Vercel serverless function
 *
 * Query params:
 * - session_id: Stripe checkout session ID
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
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'session_id parameter required'
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(200).json({
        success: false,
        error: 'Payment not completed yet'
      });
    }

    // Get user from database by email
    const result = await pool.query(
      'SELECT email, premium_key, subscription_tier, premium_until, subscription_canceled FROM users WHERE email = $1',
      [session.customer_email]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'Premium activation pending. Please wait a moment and try again.'
      });
    }

    const user = result.rows[0];

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
    console.error('Error verifying session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify session'
    });
  }
};
