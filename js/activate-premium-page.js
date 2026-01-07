// Activate Premium page - handles Stripe checkout return

// Get API URL from config
const API_BASE_URL = window.EUMENIDES_CONFIG?.apiUrl || 'https://eumenides-git-preview-snaxs-projects-47698530.vercel.app';

document.addEventListener('DOMContentLoaded', function() {
  // Apply i18n translations
  applyTranslations();

  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const button = document.getElementById('activateBtn');

  function applyTranslations() {
    // Set document title
    document.title = chrome.i18n.getMessage('activatePremiumTitle') || 'Activate Premium - Eumenides';

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const canceled = urlParams.get('canceled');
  const sessionId = urlParams.get('session_id');

  if (canceled === 'true') {
    // User canceled the payment
    statusDiv.classList.add('error');
    statusText.textContent = 'Payment canceled. You can try again anytime.';
    button.textContent = 'Try Again';
    button.style.display = 'inline-block';
    button.addEventListener('click', () => {
      window.location.href = 'premium_page.html';
    });
    return;
  }

  if (success === 'true' && sessionId) {
    // Payment successful - verify session with backend
    statusDiv.classList.add('processing');
    statusText.textContent = 'Processing your payment... This may take a few moments.';
    button.style.display = 'none';

    // First, try to verify the session directly with the backend
    async function verifySession() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (data.success && data.premiumKey) {
          // Store premium key and activate
          await chrome.storage.sync.set({
            premiumKey: data.premiumKey,
            premium: true,
            premiumPlan: data.plan || 'basic',
            premiumEmail: data.email,
            premiumUntil: data.expiresAt,
            subscriptionCanceled: data.subscriptionCanceled || false
          });

          statusDiv.classList.remove('processing');
          statusDiv.classList.add('success');
          statusText.textContent = chrome.i18n.getMessage('premiumActivated') || '✅ Premium activated successfully!';
          button.textContent = 'Open Dashboard';
          button.style.display = 'inline-block';
          button.addEventListener('click', () => {
            chrome.tabs.create({ url: 'dashboard.html' });
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error verifying session:', error);
        return false;
      }
    }

    // Try to verify session immediately
    const verified = await verifySession();

    if (!verified) {
      // If not verified yet, poll for premium activation
      let pollCount = 0;
      const maxPolls = 20; // 20 seconds max

      const pollInterval = setInterval(async () => {
        pollCount++;

        try {
          // Check if premium is activated in storage
          const result = await chrome.storage.sync.get(['premiumKey', 'premium']);

          if (result.premiumKey && result.premium) {
            // Premium already activated
            clearInterval(pollInterval);
            statusDiv.classList.remove('processing');
            statusDiv.classList.add('success');
            statusText.textContent = chrome.i18n.getMessage('premiumActivated') || '✅ Premium activated successfully!';
            button.textContent = 'Open Dashboard';
            button.style.display = 'inline-block';
            button.addEventListener('click', () => {
              chrome.tabs.create({ url: 'dashboard.html' });
            });
            return;
          }

          // Try to verify session again
          if (pollCount % 3 === 0) {
            const verified = await verifySession();
            if (verified) {
              clearInterval(pollInterval);
              return;
            }
          }

          if (pollCount >= maxPolls) {
            // Timeout - webhook might not have processed yet
            clearInterval(pollInterval);
            statusDiv.classList.remove('processing');
            statusDiv.classList.add('warning');
            statusText.textContent = 'Payment received! Your premium access will be activated shortly. Please check back in a few minutes or reload this page.';
            button.textContent = 'Reload Page';
            button.style.display = 'inline-block';
            button.addEventListener('click', () => {
              window.location.reload();
            });
          }
        } catch (error) {
          console.error('Error checking premium status:', error);
        }
      }, 1000); // Poll every second
    }

  } else {
    // No URL parameters - show manual activation option
    statusText.textContent = 'Enter your premium key to activate premium features.';
    button.style.display = 'none';

    // Show premium key input
    const inputHTML = `
      <div style="margin-top: 20px;">
        <input
          type="text"
          id="premiumKeyInput"
          placeholder="Enter your premium key"
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 16px;
            margin-bottom: 15px;
          "
        />
        <button
          id="verifyBtn"
          style="
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            color: #000;
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          "
        >Verify Key</button>
      </div>
    `;

    statusDiv.insertAdjacentHTML('afterend', inputHTML);

    const verifyBtn = document.getElementById('verifyBtn');
    const premiumKeyInput = document.getElementById('premiumKeyInput');

    verifyBtn.addEventListener('click', async () => {
      const key = premiumKeyInput.value.trim();

      if (!key) {
        alert('Please enter a premium key');
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';

      try {
        // Verify with backend
        const response = await fetch(`${API_BASE_URL}/api/verify-premium?premiumKey=${encodeURIComponent(key)}`);
        const data = await response.json();

        if (data.valid) {
          // Store premium key and activate
          await chrome.storage.sync.set({
            premiumKey: key,
            premium: true,
            premiumPlan: data.plan || 'basic',
            premiumEmail: data.email,
            premiumUntil: data.expiresAt
          });

          statusDiv.classList.add('success');
          statusText.textContent = chrome.i18n.getMessage('premiumActivated') || '✅ Premium activated successfully!';
          premiumKeyInput.style.display = 'none';
          verifyBtn.textContent = '✓ Activated';

          setTimeout(() => {
            chrome.tabs.create({ url: 'dashboard.html' });
          }, 1500);
        } else {
          statusDiv.classList.add('error');
          statusText.textContent = 'Invalid premium key. Please check and try again.';
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify Key';
        }
      } catch (error) {
        console.error('Error verifying premium key:', error);
        statusDiv.classList.add('error');
        statusText.textContent = 'Error verifying key. Please try again.';
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Key';
      }
    });

    // Allow Enter key to submit
    premiumKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        verifyBtn.click();
      }
    });
  }
});
