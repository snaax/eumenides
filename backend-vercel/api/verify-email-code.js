const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");

/**
 * Verify email code BEFORE checkout
 * Returns verified status to allow proceeding to Stripe checkout
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
    const { email, code } = req.body;

    console.log("Verifying email code for:", email);

    // Validate inputs
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Verification code is required" });
    }

    // Normalize code (remove spaces, ensure 6 digits)
    const normalizedCode = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({
        error: "Invalid code format. Code must be 6 digits.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify code in database
    const codeResult = await pool.query(
      `SELECT id, email, created_at, expires_at, used
       FROM activation_codes
       WHERE email = $1 AND code = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, normalizedCode]
    );

    if (codeResult.rows.length === 0) {
      console.warn("Invalid verification code attempt:", normalizedEmail);
      return res.status(400).json({
        error: "Invalid verification code. Please check and try again.",
      });
    }

    const activationCode = codeResult.rows[0];

    // Check if code is already used
    if (activationCode.used) {
      return res.status(400).json({
        error: "This verification code has already been used.",
      });
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(activationCode.expires_at);

    if (expiresAt <= now) {
      return res.status(400).json({
        error: "This verification code has expired. Please request a new one.",
      });
    }

    // Mark code as used
    await pool.query(
      `UPDATE activation_codes
       SET used = true, used_at = NOW()
       WHERE id = $1`,
      [activationCode.id]
    );

    console.log("✅ Email verified successfully:", normalizedEmail);

    // Return success - email is verified, can proceed to checkout
    res.status(200).json({
      success: true,
      verified: true,
      email: normalizedEmail,
      message: "Email verified successfully. You can now proceed to checkout.",
    });
  } catch (error) {
    console.error("Verify email code error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};
