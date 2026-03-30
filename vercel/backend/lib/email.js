/**
 * Email service - Resend provider
 */

async function sendActivationCode(email, code) {
  const subject = "Your Eumenides Activation Code";
  const text = `Your activation code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { background: white; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .code { font-size: 36px; font-weight: bold; color: #667eea; text-align: center; letter-spacing: 8px; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="color: #333;">🔐 Your Activation Code</h1>
        <p>Enter this code in your Eumenides extension to activate your premium subscription:</p>
        <div class="code">${code}</div>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        <p>If you didn't request this code, please ignore this email.</p>
        <div class="footer">
          <p>Eumenides - Social Media Post Interceptor</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, text, html);
}

async function sendWelcomeEmail(email, tier) {
  const subject = "Welcome to Eumenides Premium! ✨";
  const text = `Welcome to Eumenides Premium!\n\nYour ${tier} subscription is now active.\n\nThank you for your support!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { background: white; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .feature { padding: 10px 0; padding-left: 25px; position: relative; }
        .feature:before { content: "✓"; position: absolute; left: 0; color: #4ade80; font-weight: bold; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="color: #667eea;">✨ Welcome to Premium!</h1>
        <p>Thank you for subscribing to Eumenides <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)}</strong>!</p>
        <div class="feature">Unlimited daily posts</div>
        <div class="feature">All ${tier === 'full' ? '7' : '3'} sensitivity levels unlocked</div>
        <div class="feature">Advanced analytics dashboard</div>
        <div class="feature">Priority support</div>
        <div class="footer">
          <p>Eumenides - Social Media Post Interceptor</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, text, html);
}

async function sendEmail(to, subject, text, html) {
  const { Resend } = require("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.FROM_EMAIL || "noreply@eumenides.eu",
    to,
    subject,
    text,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message);
  }

  console.log(`✉️ Email sent via Resend to ${to}`);
  return true;
}

module.exports = { sendActivationCode, sendWelcomeEmail, sendEmail };
