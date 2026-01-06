const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe checkout session
 * Works on both Vercel and Railway
 * @param {string} email - Customer email
 * @param {string} extensionId - Chrome extension ID
 * @param {string} plan - Subscription plan ('basic' or 'full')
 */
async function createCheckoutSession(email, extensionId, plan = 'basic') {
  // Get the correct price ID based on plan
  const priceId = plan === 'full'
    ? process.env.STRIPE_PRICE_ID_FULL
    : process.env.STRIPE_PRICE_ID_BASIC;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `chrome-extension://${extensionId}/html/activate-premium.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `chrome-extension://${extensionId}/html/activate-premium.html?canceled=true`,
    customer_email: email,
    metadata: {
      extension_id: extensionId,
      subscription_tier: plan
    }
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
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = {
  createCheckoutSession,
  constructWebhookEvent,
  stripe
};
