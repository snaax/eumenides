const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");
const { sendActivationCode } = require("../lib/email");

/**
 * Send verification code for NEW users BEFORE checkout
 * This verifies email ownership before allowing Stripe checkout
 * Different from activation codes (which are for existing subscribers)
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

    console.log("Pre-checkout verification request for:", email);

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Block disposable email domains
    const disposableDomains = [
      "tempmail.com",
      "guerrillamail.com",
      "10minutemail.com",
      "mailinator.com",
      "throwaway.email",
      "temp-mail.org",
      "fakeinbox.com",
      "trashmail.com",
    ];

    const emailDomain = normalizedEmail.split("@")[1];
    if (disposableDomains.includes(emailDomain)) {
      console.warn("Blocked disposable email:", normalizedEmail);
      return res.status(400).json({
        error: "Disposable email addresses are not allowed. Please use a permanent email address.",
      });
    }

    // Check if user already has active subscription
    const existingUser = await pool.query(
      `SELECT email, premium_until, is_active
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      const now = new Date();
      const premiumUntil = new Date(user.premium_until);

      // If subscription is still active
      if (premiumUntil > now && user.is_active) {
        return res.status(400).json({
          error: "This email already has an active subscription. Please use 'Connect existing account' instead.",
        });
      }
      // If expired or canceled, allow them to subscribe again
    }

    // Rate limiting: Check for recent codes
    const recentCodesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM activation_codes
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [normalizedEmail]
    );

    const recentCodesCount = parseInt(recentCodesResult.rows[0].count);

    if (recentCodesCount >= 5) {
      console.warn("Rate limit exceeded for email:", normalizedEmail);
      return res.status(429).json({
        error: "Too many verification attempts. Please try again in one hour.",
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
      console.log("Verification code sent to:", normalizedEmail);

      res.status(200).json({
        success: true,
        message: "Verification code sent to your email",
        expiresIn: 600, // 10 minutes in seconds
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);

      // Delete the code since we couldn't send it
      await pool.query(
        "DELETE FROM activation_codes WHERE email = $1 AND code = $2",
        [normalizedEmail, code]
      );

      return res.status(500).json({
        error: "Failed to send verification code. Please try again or contact support.",
      });
    }
  } catch (error) {
    console.error("Send verification code error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};
