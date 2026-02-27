/**
 * Email service for sending activation codes and notifications
 * Supports multiple providers: SendGrid, AWS SES, Console (for testing)
 */

/**
 * Send activation code email
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit activation code
 * @returns {Promise<boolean>} - Success status
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

/**
 * Send welcome email after successful subscription
 * @param {string} email - Recipient email address
 * @param {string} tier - Subscription tier (basic/full)
 * @returns {Promise<boolean>} - Success status
 */
async function sendWelcomeEmail(email, tier) {
  const subject = "Welcome to Eumenides Premium! ✨";
  const text = `Welcome to Eumenides Premium!\n\nYour ${tier} subscription is now active.\n\nYou can now enjoy:\n- Unlimited daily posts\n- Advanced sensitivity levels\n- Priority support\n\nThank you for your support!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { background: white; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .feature { padding: 10px 0; padding-left: 25px; position: relative; }
        .feature:before { content: "✓"; position: absolute; left: 0; color: #4ade80; font-weight: bold; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #667eea;">✨ Welcome to Premium!</h1>
        </div>
        <p>Thank you for subscribing to Eumenides <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)}</strong> plan!</p>
        <p>Your premium features are now active:</p>
        <div class="feature">Unlimited daily posts (no 5/5 limit)</div>
        <div class="feature">All ${tier === 'full' ? '7' : '3'} sensitivity levels unlocked</div>
        <div class="feature">Advanced analytics dashboard</div>
        <div class="feature">Priority support</div>
        <p style="margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
        <div class="footer">
          <p>Eumenides - Social Media Post Interceptor</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, text, html);
}

/**
 * Generic email sending function
 * Routes to appropriate email provider based on environment configuration
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @returns {Promise<boolean>} - Success status
 */
async function sendEmail(to, subject, text, html) {
  const provider = process.env.EMAIL_PROVIDER || "console";

  try {
    switch (provider.toLowerCase()) {
      case "sendgrid":
        return await sendViaSendGrid(to, subject, text, html);
      case "ses":
      case "aws":
        return await sendViaAwsSes(to, subject, text, html);
      case "mailjet":
        return await sendViaMailjet(to, subject, text, html);
      case "console":
      default:
        return sendViaConsole(to, subject, text, html);
    }
  } catch (error) {
    console.error("Email sending error:", error);
    // Fallback to console in case of error
    return sendViaConsole(to, subject, text, html);
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(to, subject, text, html) {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: to,
    from: process.env.FROM_EMAIL || "noreply@eumenides.app",
    subject: subject,
    text: text,
    html: html,
  };

  await sgMail.send(msg);
  console.log(`✉️ Email sent via SendGrid to ${to}`);
  return true;
}

/**
 * Send email via AWS SES
 */
async function sendViaAwsSes(to, subject, text, html) {
  const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

  const client = new SESClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const params = {
    Source: process.env.FROM_EMAIL || "noreply@eumenides.app",
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Text: {
          Data: text,
        },
        Html: {
          Data: html,
        },
      },
    },
  };

  const command = new SendEmailCommand(params);
  await client.send(command);
  console.log(`✉️ Email sent via AWS SES to ${to}`);
  return true;
}

/**
 * Send email via Mailjet
 */
async function sendViaMailjet(to, subject, text, html) {
  const mailjet = require("node-mailjet").apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
  );

  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: process.env.FROM_EMAIL || "noreply@eumenides.app",
          Name: "Eumenides",
        },
        To: [
          {
            Email: to,
          },
        ],
        Subject: subject,
        TextPart: text,
        HTMLPart: html,
      },
    ],
  });

  await request;
  console.log(`✉️ Email sent via Mailjet to ${to}`);
  return true;
}

/**
 * Console logger (for testing/development)
 * In production, set EMAIL_PROVIDER to 'sendgrid', 'ses', or 'mailjet'
 */
function sendViaConsole(to, subject, text, html) {
  console.log("\n" + "=".repeat(80));
  console.log("📧 EMAIL (Console Mode - Development Only)");
  console.log("=".repeat(80));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("-".repeat(80));
  console.log(text);
  console.log("=".repeat(80) + "\n");

  // In development, always return true
  // In production, you should set EMAIL_PROVIDER env variable
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  WARNING: Using console email in production! Set EMAIL_PROVIDER env variable."
    );
  }

  return true;
}

module.exports = {
  sendActivationCode,
  sendWelcomeEmail,
  sendEmail,
};
