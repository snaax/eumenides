const { stripe } = require('../lib/stripe');
const { pool } = require('../lib/database');

/**
 * Cancel a user's subscription
 * Vercel serverless function
 */
module.exports = async (req, res) => {
  console.log('=== CANCEL SUBSCRIPTION ===');
  console.log('Method:', req.method);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { premiumKey } = req.body;

    if (!premiumKey) {
      return res.status(400).json({
        success: false,
        error: 'premiumKey is required'
      });
    }

    console.log('Looking up user with premium key...');

    // Get user from database
    const result = await pool.query(
      'SELECT email, stripe_subscription_id, premium_until FROM users WHERE premium_key = $1',
      [premiumKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found for this premium key'
      });
    }

    const user = result.rows[0];
    console.log('User found:', user.email);

    if (!user.stripe_subscription_id) {
      return res.status(400).json({
        success: false,
        error: 'No active Stripe subscription found'
      });
    }

    console.log('Canceling Stripe subscription:', user.stripe_subscription_id);

    // Cancel the subscription in Stripe
    // This will set it to cancel at period end
    const subscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    console.log('Subscription canceled at period end:', subscription.current_period_end);

    // Update database to mark subscription as canceled
    await pool.query(
      'UPDATE users SET subscription_canceled = true WHERE premium_key = $1',
      [premiumKey]
    );

    const periodEndDate = new Date(subscription.current_period_end * 1000);

    console.log('=== CANCELLATION SUCCESS ===');
    return res.status(200).json({
      success: true,
      message: 'Subscription canceled successfully',
      activeUntil: periodEndDate.toISOString()
    });

  } catch (error) {
    console.error('=== CANCELLATION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
};
