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
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));

  // Only POST allowed
  if (req.method !== 'POST') {
    console.log('ERROR: Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sig = req.headers['stripe-signature'];
    console.log('Stripe signature present:', !!sig);

    // Construct event (verifies signature)
    const event = await constructWebhookEvent(req.body, sig);
    console.log('Event type:', event.type);
    console.log('Event ID:', event.id);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed');
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log('Processing customer.subscription.updated');
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log('Processing customer.subscription.deleted');
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log('Processing invoice.payment_failed');
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log('=== WEBHOOK SUCCESS ===');
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
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
      INSERT INTO users (email, premium_key, stripe_customer_id, stripe_subscription_id, stripe_session_id, premium_until, subscription_tier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email)
      DO UPDATE SET
        premium_key = $2,
        stripe_subscription_id = $4,
        stripe_session_id = $5,
        premium_until = $6,
        subscription_tier = $7,
        updated_at = NOW()
    `, [
      session.customer_email,
      premiumKey,
      session.customer,
      session.subscription,
      session.id,
      expiresAt,
      subscriptionTier
    ]);

    console.log('Premium key generated:', premiumKey, 'Plan:', subscriptionTier, 'Session:', session.id);

    // TODO: Send email to user with premium key
    // You can use SendGrid, AWS SES, or other email service

  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Handle subscription update (e.g., when cancel_at_period_end is set)
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  console.log('Cancel at period end:', subscription.cancel_at_period_end);
  console.log('Current period end:', new Date(subscription.current_period_end * 1000));

  try {
    if (subscription.cancel_at_period_end) {
      // User has requested cancellation - mark as canceled in DB
      await pool.query(`
        UPDATE users
        SET subscription_canceled = true
        WHERE stripe_subscription_id = $1
      `, [subscription.id]);
      console.log('Subscription marked as canceled (will remain active until period end)');
    } else {
      // Subscription was reactivated - clear the canceled flag
      await pool.query(`
        UPDATE users
        SET subscription_canceled = false
        WHERE stripe_subscription_id = $1
      `, [subscription.id]);
      console.log('Subscription reactivated');
    }
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Handle subscription deletion (when it actually ends)
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted (ended):', subscription.id);

  try {
    // Set premium_until to NOW to immediately disable premium
    await pool.query(`
      UPDATE users
      SET premium_until = NOW(),
          subscription_canceled = true
      WHERE stripe_subscription_id = $1
    `, [subscription.id]);
    console.log('Premium access disabled');
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
