const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");
const { sendActivationCode } = require("../lib/email");

/**
 * Request activation code for existing premium subscribers
 * This allows users to activate premium on new browsers/devices
 * Vercel serverless function
 */
module.exports = async (req, res) => {
  // CORS headers
  if (process.env.ALLOWED_ORIGINS) {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGINS);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    console.log("Activation code request for:", email);

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email has active subscription
    const userResult = await pool.query(
      `SELECT email, premium_until, subscription_tier, is_active
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "No subscription found for this email address",
      });
    }

    const user = userResult.rows[0];

    // Check if subscription is active and not expired
    const now = new Date();
    const premiumUntil = new Date(user.premium_until);

    if (premiumUntil <= now) {
      return res.status(403).json({
        error: "Your subscription has expired. Please renew to continue.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "Your subscription is inactive. Please contact support.",
      });
    }

    // Rate limiting: Check for recent codes
    const recentCodesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM activation_codes
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [normalizedEmail]
    );

    const recentCodesCount = parseInt(recentCodesResult.rows[0].count);

    if (recentCodesCount >= 3) {
      console.warn("Rate limit exceeded for email:", normalizedEmail);
      return res.status(429).json({
        error:
          "Too many activation code requests. Please try again in one hour.",
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in database (expires in 10 minutes)
    await pool.query(
      `INSERT INTO activation_codes (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [normalizedEmail, code]
    );

    // Send email with code
    try {
      await sendActivationCode(normalizedEmail, code);
      console.log("Activation code sent to:", normalizedEmail);

      res.status(200).json({
        success: true,
        message: "Activation code sent to your email",
        expiresIn: 600, // 10 minutes in seconds
      });
    } catch (emailError) {
      console.error("Failed to send activation email:", emailError);

      // Delete the code since we couldn't send it
      await pool.query(
        "DELETE FROM activation_codes WHERE email = $1 AND code = $2",
        [normalizedEmail, code]
      );

      return res.status(500).json({
        error:
          "Failed to send activation code. Please try again or contact support.",
      });
    }
  } catch (error) {
    console.error("Request activation code error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};
