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
            // Try to redirect immediately
            try {
              window.location.replace('${extensionUrl}');
            } catch (e) {
              console.error('Redirect failed:', e);
            }

            // Show manual link after 1 second
            setTimeout(function() {
              document.getElementById('manual-link').style.display = 'block';
            }, 1000);
          </script>
        </head>
        <body>
          <div class="container">
            <h1>${success === "true" ? "✅ Payment Successful!" : "❌ Payment Canceled"}</h1>
            <p>${success === "true" ? "Redirecting you back to the extension..." : "Redirecting you back to try again..."}</p>
            <div class="spinner"></div>
            <div id="manual-link" style="display: none; margin-top: 20px;">
              <p>If you're not redirected automatically:</p>
              <p><a href="${extensionUrl}">Click here to return to the extension</a></p>
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
