const { createCheckoutSession } = require("../lib/stripe");
const { validateEmail, validateExtensionId } = require("../lib/validators");
const { pool } = require("../lib/database");
const { handleCors } = require("../lib/cors");

/**
 * Create Stripe checkout session
 * Vercel serverless function (also works with Express when migrating to Railway)
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, extensionId, plan = "basic" } = req.body;

    console.log("Create checkout request:", { email, extensionId, plan });

    // Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    // extensionId is optional — null/absent means purchase from website
    const isWebPurchase =
      !extensionId ||
      extensionId === "undefined" ||
      extensionId === "null" ||
      typeof extensionId !== "string";

    // Additional email validation: block disposable email domains
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

    const emailDomain = email.split("@")[1].toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      console.warn("Blocked disposable email:", email);
      return res.status(400).json({
        error:
          "Disposable email addresses are not allowed. Please use a permanent email address.",
      });
    }

    if (!isWebPurchase) {
      const extValidation = validateExtensionId(extensionId);
      if (!extValidation.valid) {
        return res.status(400).json({ error: extValidation.error });
      }
    }

    // Validate plan
    if (!["basic", "full"].includes(plan)) {
      return res
        .status(400)
        .json({ error: 'Invalid plan. Must be "basic" or "full"' });
    }

    // Check if email already has an active subscription
    const existingUser = await pool.query(
      "SELECT email, premium_until, subscription_tier, subscription_canceled, created_at FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      const now = new Date();
      const premiumUntil = new Date(user.premium_until);

      // Check if subscription is still active (not expired and not canceled)
      if (premiumUntil > now && !user.subscription_canceled) {
        return res.status(400).json({
          error: "This email already has an active subscription",
          existingPlan: user.subscription_tier,
          expiresAt: user.premium_until,
        });
      }

      // If subscription is canceled or expired, allow checkout
      // This will create a new subscription and reactivate the account
    }

    // Rate limiting: Check for suspicious activity
    // Prevent someone from creating multiple checkouts in a short time
    const recentCheckouts = await pool.query(
      `SELECT COUNT(*) as count FROM users
       WHERE created_at > NOW() - INTERVAL '1 hour'
       AND email = $1`,
      [email.toLowerCase()],
    );

    if (recentCheckouts.rows[0].count > 3) {
      console.warn("Rate limit exceeded for email:", email);
      return res.status(429).json({
        error: "Too many checkout attempts. Please try again later.",
      });
    }

    // Create checkout session with selected plan
    const session = await createCheckoutSession(
      email,
      isWebPurchase ? null : extensionId,
      plan,
    );

    res.status(200).json({
      url: session.url,
      sessionId: session.id,
      plan: plan,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};
