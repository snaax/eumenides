const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe checkout session
 * Works on both Vercel and Railway
 */
async function createCheckoutSession(email, extensionId) {
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1,
    }],
    mode: 'subscription', // or 'payment' for one-time
    success_url: `chrome-extension://${extensionId}/html/activate-premium.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `chrome-extension://${extensionId}/html/activate-premium.html?canceled=true`,
    customer_email: email,
    metadata: {
      extension_id: extensionId
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
