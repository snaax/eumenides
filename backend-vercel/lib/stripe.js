const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe checkout session
 * Works on both Vercel and Railway
 * @param {string} email - Customer email
 * @param {string} extensionId - Chrome extension ID
 * @param {string} plan - Subscription plan ('basic' or 'full')
 */
async function createCheckoutSession(email, extensionId, plan = "basic") {
  console.log("Creating checkout session with extensionId (raw):", extensionId);

  // Clean extension ID - remove any leading/trailing slashes or whitespace
  const cleanExtensionId = extensionId.replace(/^\/+|\/+$/g, "").trim();
  console.log("Cleaned extensionId:", cleanExtensionId);

  // Get the correct price ID based on plan
  const priceId =
    plan === "full"
      ? process.env.STRIPE_PRICE_ID_FULL
      : process.env.STRIPE_PRICE_ID_BASIC;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  // Stripe doesn't properly support chrome-extension:// URLs
  // Use a web redirect page instead that will redirect to the extension
  const baseUrl = (process.env.PUBLIC_URL || 'https://eumenides.vercel.app').trim();

  // URL-encode the extension_id parameter
  const encodedExtensionId = encodeURIComponent(cleanExtensionId);

  const successUrl = `${baseUrl}/api/redirect?extension_id=${encodedExtensionId}&success=true&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/api/redirect?extension_id=${encodedExtensionId}&canceled=true`;

  console.log("Success URL:", JSON.stringify(successUrl));
  console.log("Cancel URL:", JSON.stringify(cancelUrl));

  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: email,
    metadata: {
      extension_id: cleanExtensionId,
      subscription_tier: plan,
    },
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
