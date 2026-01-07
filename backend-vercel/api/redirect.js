/**
 * Redirect page for Stripe checkout
 * Stripe doesn't support chrome-extension:// URLs, so we use this web page
 * as an intermediary that redirects to the extension
 */
module.exports = async (req, res) => {
  console.log('=== REDIRECT PAGE ===');
  console.log('Query params:', JSON.stringify(req.query));
  console.log('Full URL:', req.url);

  // Get parameters
  const { extension_id, success, canceled, session_id } = req.query;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting to Eumenides...</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
    }

    h1 {
      font-size: 36px;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 20px;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid #ffd700;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: rgba(255, 107, 107, 0.3);
      border: 2px solid #ff6b6b;
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
      display: none;
    }

    .error.show {
      display: block;
    }

    button {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      color: #000;
      padding: 15px 30px;
      border: none;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 20px;
      box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
      transition: 0.3s;
    }

    button:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(255, 215, 0, 0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Eumenides</h1>
    <p id="status">Processing your payment...</p>
    <div class="spinner"></div>

    <!-- Debug info -->
    <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px; font-family: monospace; font-size: 12px; text-align: left;">
      <div>Extension ID: <span id="debugExtId">...</span></div>
      <div>Success: <span id="debugSuccess">...</span></div>
      <div>Session ID: <span id="debugSession">...</span></div>
      <div>Redirect URL: <span id="debugUrl">...</span></div>
    </div>

    <div class="error" id="error">
      <p id="errorMessage">Unable to redirect. Please make sure the Eumenides extension is installed.</p>
      <button onclick="retry()">Retry</button>
    </div>
  </div>

  <script>
    const extensionId = ${JSON.stringify(extension_id)};
    const success = ${JSON.stringify(success)};
    const canceled = ${JSON.stringify(canceled)};
    const sessionId = ${JSON.stringify(session_id)};

    console.log('Redirect params:', { extensionId, success, canceled, sessionId });

    // Update debug display
    document.getElementById('debugExtId').textContent = extensionId || 'NULL';
    document.getElementById('debugSuccess').textContent = success || 'NULL';
    document.getElementById('debugSession').textContent = sessionId || 'NULL';

    function redirect() {
      if (!extensionId || extensionId === 'null' || extensionId === 'undefined') {
        showSuccess('Payment successful! You can close this tab and return to the extension to use your premium features.');
        return;
      }

      // Build the extension URL for display purposes
      let extensionUrl = 'chrome-extension://' + extensionId + '/html/activate-premium.html?';

      if (success === 'true') {
        extensionUrl += 'success=true&session_id=' + sessionId;
      } else if (canceled === 'true') {
        extensionUrl += 'canceled=true';
      }

      document.getElementById('debugUrl').textContent = extensionUrl;
      console.log('Extension URL (for reference):', extensionUrl);

      // Show success message - don't try to redirect as Chrome blocks chrome-extension:// redirects
      if (success === 'true') {
        showSuccess('✅ Payment successful! You can close this tab and return to the Eumenides extension. Your premium features will be activated automatically.');
      } else if (canceled === 'true') {
        showCanceled('Payment was canceled. You can close this tab.');
      } else {
        showSuccess('You can close this tab and return to the extension.');
      }
    }

    function showSuccess(message) {
      document.getElementById('status').innerHTML = '<strong>✅ Success!</strong>';
      document.getElementById('errorMessage').textContent = message;
      document.getElementById('error').classList.add('show');
      document.getElementById('error').style.background = 'rgba(74, 222, 128, 0.3)';
      document.getElementById('error').style.borderColor = '#4ade80';
      document.querySelector('.spinner').style.display = 'none';

      // Change button to "Close Tab"
      const button = document.querySelector('button');
      button.textContent = 'Close Tab';
      button.onclick = function() { window.close(); };
    }

    function showCanceled(message) {
      document.getElementById('status').innerHTML = '<strong>⚠️ Canceled</strong>';
      document.getElementById('errorMessage').textContent = message;
      document.getElementById('error').classList.add('show');
      document.getElementById('error').style.background = 'rgba(251, 191, 36, 0.3)';
      document.getElementById('error').style.borderColor = '#fbbf24';
      document.querySelector('.spinner').style.display = 'none';

      // Change button to "Close Tab"
      const button = document.querySelector('button');
      button.textContent = 'Close Tab';
      button.onclick = function() { window.close(); };
    }

    function showError(message) {
      document.getElementById('status').textContent = 'Redirect failed';
      document.getElementById('errorMessage').textContent = message;
      document.getElementById('error').classList.add('show');
      document.querySelector('.spinner').style.display = 'none';
    }

    function retry() {
      document.getElementById('error').classList.remove('show');
      document.querySelector('.spinner').style.display = 'block';
      document.getElementById('status').textContent = 'Redirecting to your extension...';
      setTimeout(redirect, 500);
    }

    // Start redirect immediately
    redirect();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
