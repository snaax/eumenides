const { createCheckoutSession } = require('../lib/stripe');
const { validateEmail, validateExtensionId } = require('../lib/validators');

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
    const { email, extensionId } = req.body;

    // Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const extValidation = validateExtensionId(extensionId);
    if (!extValidation.valid) {
      return res.status(400).json({ error: extValidation.error });
    }

    // Create checkout session
    const session = await createCheckoutSession(email, extensionId);

    res.status(200).json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
