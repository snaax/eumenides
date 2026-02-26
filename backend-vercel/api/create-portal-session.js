const { stripe } = require("../lib/stripe");
const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");

/**
 * Create Stripe Customer Portal session
 * Allows users to manage their subscription (cancel, update payment, etc.)
 * Vercel serverless function
 */
module.exports = async (req, res) => {
  // CORS headers (wildcard set in vercel.json, this is for runtime override)
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

    // Validate input
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Get customer from database
    const result = await pool.query(
      "SELECT stripe_customer_id FROM users WHERE email = $1",
      [email.toLowerCase().trim()],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No subscription found for this email" });
    }

    const customerId = result.rows[0].stripe_customer_id;

    if (!customerId) {
      return res.status(404).json({ error: "No Stripe customer ID found" });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.PORTAL_RETURN_URL,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
};
