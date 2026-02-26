/**
 * Stripe redirect handler
 * Redirects from Stripe back to the Chrome extension
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only GET allowed
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { extension_id, success, canceled, session_id } = req.query;

    console.log("Redirect query params:", req.query);
    console.log("Extension ID received:", extension_id);

    // Validate extension_id
    if (
      !extension_id ||
      extension_id === "undefined" ||
      extension_id === "null"
    ) {
      return res.status(400).send(`
        <html>
          <head><title>Error - Eumenides</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>Missing extension ID</p>
            <p>Please try activating premium again from the extension.</p>
          </body>
        </html>
      `);
    }

    // Build the chrome-extension URL
    const extensionUrl =
      success === "true"
        ? `chrome-extension://${extension_id}/html/activate.html?success=true&session_id=${session_id || ""}`
        : `chrome-extension://${extension_id}/html/activate-premium.html?canceled=true`;

    console.log("Redirecting to:", extensionUrl);

    // Try HTTP 302 redirect (may not work with chrome-extension://)
    // If this fails, browser will show the HTML fallback
    res.setHeader("Location", extensionUrl);
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Redirecting - Eumenides</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.15);
              backdrop-filter: blur(10px);
              padding: 40px;
              border-radius: 20px;
              max-width: 500px;
            }
            h1 { margin-bottom: 20px; }
            .spinner {
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top: 4px solid white;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            a {
              color: #ffd700;
              text-decoration: none;
              font-weight: bold;
            }
            a:hover { text-decoration: underline; }
          </style>
          <script>
            // Chrome blocks automatic redirects to chrome-extension:// URLs
            // Show manual link immediately
            window.addEventListener('DOMContentLoaded', function() {
              document.getElementById('manual-link').style.display = 'block';
              document.getElementById('loading-text').style.display = 'none';
              document.getElementById('spinner').style.display = 'none';
            });
          </script>
        </head>
        <body>
          <div class="container">
            <h1>${success === "true" ? "✅ Payment Successful!" : "❌ Payment Canceled"}</h1>
            <p id="loading-text">${success === "true" ? "Preparing your activation..." : "Redirecting you back..."}</p>
            <div id="spinner" class="spinner"></div>
            <div id="manual-link" style="display: none; margin-top: 20px;">
              <p style="font-size: 18px; margin-bottom: 15px; font-weight: 600;">Click below to complete your activation:</p>
              <a href="${extensionUrl}" style="
                display: inline-block;
                background: white;
                color: #667eea;
                padding: 15px 40px;
                border-radius: 50px;
                text-decoration: none;
                font-weight: bold;
                font-size: 18px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                transition: all 0.2s;
              " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 5px 20px rgba(0,0,0,0.3)'">
                🚀 Return to Extension & Activate
              </a>
              <p style="margin-top: 15px; font-size: 14px; opacity: 0.8;">This will open the extension in a new tab</p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send(`
      <html>
        <head><title>Error - Eumenides</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Something went wrong</h1>
          <p>${error.message}</p>
          <p>Please close this tab and try again from the extension.</p>
        </body>
      </html>
    `);
  }
};
