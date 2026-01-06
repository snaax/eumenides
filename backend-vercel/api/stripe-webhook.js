const { constructWebhookEvent } = require('../lib/stripe');
const { pool } = require('../lib/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Handle Stripe webhooks
 * Vercel serverless function (also works with Express when migrating to Railway)
 *
 * IMPORTANT: Vercel requires special handling for raw body
 */
module.exports = async (req, res) => {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sig = req.headers['stripe-signature'];

    // Construct event (verifies signature)
    const event = await constructWebhookEvent(req.body, sig);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.customer_email);

  const premiumKey = uuidv4();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const subscriptionTier = session.metadata?.subscription_tier || 'basic';

  try {
    await pool.query(`
      INSERT INTO users (email, premium_key, stripe_customer_id, stripe_subscription_id, premium_until, subscription_tier)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email)
      DO UPDATE SET
        premium_key = $2,
        stripe_subscription_id = $4,
        premium_until = $5,
        subscription_tier = $6,
        updated_at = NOW()
    `, [
      session.customer_email,
      premiumKey,
      session.customer,
      session.subscription,
      expiresAt,
      subscriptionTier
    ]);

    console.log('Premium key generated:', premiumKey, 'Plan:', subscriptionTier);

    // TODO: Send email to user with premium key
    // You can use SendGrid, AWS SES, or other email service

  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription) {
  console.log('Subscription canceled:', subscription.id);

  try {
    await pool.query(`
      UPDATE users
      SET premium_until = NOW()
      WHERE stripe_subscription_id = $1
    `, [subscription.id]);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log('Payment failed for customer:', invoice.customer);

  // TODO: Send notification email to user
  // Consider grace period before disabling premium
}
