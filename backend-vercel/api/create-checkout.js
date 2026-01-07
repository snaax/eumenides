const { createCheckoutSession } = require('../lib/stripe');
const { validateEmail, validateExtensionId } = require('../lib/validators');
const { pool } = require('../lib/database');

/**
 * Create Stripe checkout session
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
    const { email, extensionId, plan = 'basic' } = req.body;

    // Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const extValidation = validateExtensionId(extensionId);
    if (!extValidation.valid) {
      return res.status(400).json({ error: extValidation.error });
    }

    // Validate plan
    if (!['basic', 'full'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "basic" or "full"' });
    }

    // Check if email already has an active subscription
    const existingUser = await pool.query(
      'SELECT email, premium_until, subscription_tier, subscription_canceled FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      const now = new Date();
      const premiumUntil = new Date(user.premium_until);

      // Check if subscription is still active (not expired and not canceled)
      if (premiumUntil > now && !user.subscription_canceled) {
        return res.status(400).json({
          error: 'This email already has an active subscription',
          existingPlan: user.subscription_tier,
          expiresAt: user.premium_until
        });
      }

      // If subscription is canceled or expired, allow checkout
      // This will create a new subscription and reactivate the account
    }

    // Create checkout session with selected plan
    const session = await createCheckoutSession(email, extensionId, plan);

    res.status(200).json({
      url: session.url,
      sessionId: session.id,
      plan: plan
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
