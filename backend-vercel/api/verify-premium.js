const { pool } = require('../lib/database');
const { validatePremiumKey } = require('../lib/validators');

/**
 * Verify premium key
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
    const { premiumKey } = req.body;

    // Validate input
    const validation = validatePremiumKey(premiumKey);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Query database
    const result = await pool.query(
      'SELECT email, premium_until FROM users WHERE premium_key = $1',
      [premiumKey]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ valid: false, reason: 'Invalid key' });
    }

    const user = result.rows[0];
    const isValid = new Date(user.premium_until) > new Date();

    if (!isValid) {
      return res.status(200).json({ valid: false, reason: 'Expired' });
    }

    res.status(200).json({
      valid: true,
      email: user.email,
      expiresAt: user.premium_until
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
