const { stripe } = require("../lib/stripe");
const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");
const { handleCors } = require("../lib/cors");

/**
 * Upgrade or downgrade an existing subscription to a different plan.
 * Stripe handles proration automatically — the user pays only the difference.
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, newPlan } = req.body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    if (!["basic", "full"].includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "basic" or "full"' });
    }

    // Get user from DB
    const result = await pool.query(
      "SELECT stripe_subscription_id, subscription_tier FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No active subscription found for this email" });
    }

    const user = result.rows[0];

    if (!user.stripe_subscription_id) {
      return res.status(404).json({ error: "No Stripe subscription found" });
    }

    if (user.subscription_tier === newPlan) {
      return res.status(400).json({ error: "You are already on this plan" });
    }

    const newPriceId = newPlan === "full"
      ? process.env.STRIPE_PRICE_ID_FULL
      : process.env.STRIPE_PRICE_ID_BASIC;

    if (!newPriceId) {
      return res.status(500).json({ error: `Price ID not configured for plan: ${newPlan}` });
    }

    // Retrieve subscription to get the item ID
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    const itemId = subscription.items.data[0].id;

    // Update subscription — Stripe prorates the charge automatically
    await stripe.subscriptions.update(user.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    // Update tier in DB immediately (webhook will also confirm this)
    await pool.query(
      "UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE email = $2",
      [newPlan, email.toLowerCase().trim()]
    );

    console.log(`Subscription upgraded for ${email}: ${user.subscription_tier} → ${newPlan}`);
    res.status(200).json({ success: true, newPlan });
  } catch (error) {
    console.error("Upgrade subscription error:", error);
    res.status(500).json({ error: "Failed to upgrade subscription" });
  }
};
