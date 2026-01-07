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
  const apiBaseUrl = process.env.PUBLIC_URL || 'https://eumenides.vercel.app';

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
      width: 100%;
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
      font-size: 18px;
      opacity: 0.95;
      margin-bottom: 20px;
      font-weight: 500;
    }

    #status strong {
      font-size: 24px;
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

    .message-box {
      background: rgba(255, 107, 107, 0.3);
      border: 2px solid #ff6b6b;
      padding: 30px;
      border-radius: 16px;
      margin-top: 30px;
      display: none;
    }

    .message-box.show {
      display: block;
    }

    .message-box p {
      font-size: 18px;
      line-height: 1.6;
      margin-bottom: 0;
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

    <div class="message-box" id="messageBox">
      <p id="message">Unable to redirect. Please make sure the Eumenides extension is installed.</p>
      <button id="actionButton" onclick="retry()">Retry</button>
    </div>
  </div>

  <script>
    const extensionId = ${JSON.stringify(extension_id)};
    const success = ${JSON.stringify(success)};
    const canceled = ${JSON.stringify(canceled)};
    const sessionId = ${JSON.stringify(session_id)};
    const apiBaseUrl = ${JSON.stringify(apiBaseUrl)};

    console.log('Redirect params:', { extensionId, success, canceled, sessionId, apiBaseUrl });

    async function redirect() {
      if (!extensionId || extensionId === 'null' || extensionId === 'undefined') {
        showSuccess('Payment successful! You can close this tab and return to the extension to use your premium features.');
        return;
      }

      // Show success message - don't try to redirect as Chrome blocks chrome-extension:// redirects
      if (success === 'true' && sessionId) {
        // Try to get premium details from the session
        showProcessing('Activating your premium features...');

        try {
          const response = await fetch(apiBaseUrl + '/api/verify-session?session_id=' + encodeURIComponent(sessionId));
          const data = await response.json();

          if (data.success && data.premiumKey) {
            const planName = data.plan === 'full' ? 'Full Plan' : 'Basic Plan';
            showSuccess('Payment successful! Your ' + planName + ' has been activated.\\n\\nYou can close this tab and return to the Eumenides extension.');
          } else {
            showSuccess('Payment successful! Your premium features are being activated.\\n\\nYou can close this tab and return to the Eumenides extension. If your premium is not active yet, please wait a moment and refresh the extension.');
          }
        } catch (error) {
          console.error('Error fetching premium details:', error);
          showSuccess('Payment successful!\\n\\nYou can close this tab and return to the Eumenides extension. Your premium features will be activated shortly.');
        }
      } else if (canceled === 'true') {
        showCanceled('Payment was canceled. You can close this tab.');
      } else {
        showSuccess('You can close this tab and return to the extension.');
      }
    }

    function showProcessing(message) {
      document.getElementById('status').textContent = message;
      document.querySelector('.spinner').style.display = 'block';
      document.getElementById('messageBox').classList.remove('show');
    }

    function showSuccess(message) {
      document.getElementById('status').innerHTML = '<strong>Success!</strong>';
      document.getElementById('message').innerHTML = message.replace(/\\n/g, '<br>');
      document.getElementById('messageBox').classList.add('show');
      document.getElementById('messageBox').style.background = 'rgba(74, 222, 128, 0.3)';
      document.getElementById('messageBox').style.borderColor = '#4ade80';
      document.querySelector('.spinner').style.display = 'none';

      const button = document.getElementById('actionButton');
      button.textContent = 'Close Tab';
      button.onclick = function() { window.close(); };
    }

    function showCanceled(message) {
      document.getElementById('status').innerHTML = '<strong>Canceled</strong>';
      document.getElementById('message').innerHTML = message.replace(/\\n/g, '<br>');
      document.getElementById('messageBox').classList.add('show');
      document.getElementById('messageBox').style.background = 'rgba(251, 191, 36, 0.3)';
      document.getElementById('messageBox').style.borderColor = '#fbbf24';
      document.querySelector('.spinner').style.display = 'none';

      const button = document.getElementById('actionButton');
      button.textContent = 'Close Tab';
      button.onclick = function() { window.close(); };
    }

    // Start redirect immediately
    redirect();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
