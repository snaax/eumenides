const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe checkout session
 * Works on both Vercel and Railway
 * @param {string} email - Customer email
 * @param {string} extensionId - Chrome extension ID
 * @param {string} plan - Subscription plan ('basic' or 'full')
 */
async function createCheckoutSession(email, extensionId, plan = "basic") {
  console.log("Creating checkout session with extensionId:", extensionId);

  // Get the correct price ID based on plan
  const priceId =
    plan === "full"
      ? process.env.STRIPE_PRICE_ID_FULL
      : process.env.STRIPE_PRICE_ID_BASIC;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  if (!process.env.PUBLIC_URL) {
    throw new Error("PUBLIC_URL environment variable is required");
  }
  const baseUrl = process.env.PUBLIC_URL.trim();

  // Website URL for web-flow redirects (defaults to PUBLIC_URL if not set separately)
  const websiteUrl = (process.env.WEBSITE_URL || baseUrl).trim();

  let successUrl, cancelUrl, metadata;

  if (!extensionId) {
    // Web purchase — redirect directly to the website payment-success page
    successUrl = `${websiteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${websiteUrl}/pricing?canceled=true`;
    metadata = { subscription_tier: plan };
  } else {
    // Extension purchase — go through /api/redirect which hands off to the extension
    const cleanExtensionId = extensionId.replace(/^\/+|\/+$/g, "").trim();
    const encodedExtensionId = encodeURIComponent(cleanExtensionId);
    successUrl = `${baseUrl}/api/redirect?extension_id=${encodedExtensionId}&success=true&session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${baseUrl}/api/redirect?extension_id=${encodedExtensionId}&canceled=true`;
    metadata = { extension_id: cleanExtensionId, subscription_tier: plan };
  }

  console.log("Success URL:", successUrl);
  console.log("Cancel URL:", cancelUrl);

  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: email,
    metadata,
  });
}

/**
 * Verify and construct Stripe webhook event
 * Works on both Vercel and Railway
 */
async function constructWebhookEvent(body, signature) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}

module.exports = {
  createCheckoutSession,
  constructWebhookEvent,
  stripe,
};
