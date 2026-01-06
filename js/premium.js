// Premium page functionality with multi-tier support and i18n

// Get API URL from config
const API_BASE_URL = window.EUMENIDES_CONFIG?.apiUrl || 'https://eumenides-git-preview-snaxs-projects-47698530.vercel.app';

// Get i18n message
function getMessage(key) {
  return chrome.i18n.getMessage(key) || key;
}

// Email validation
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Get extension ID
function getExtensionId() {
  return chrome.runtime.id;
}

// Create checkout session
async function createCheckoutSession(email, plan) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        extensionId: getExtensionId(),
        plan: plan
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Show email modal
function showEmailModal(plan) {
  // Create modal HTML
  const modalHTML = `
    <div id="email-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    ">
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
      ">
        <h2 style="
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 20px;
          text-align: center;
        ">${getMessage('enterEmail')}</h2>

        <input
          type="email"
          id="email-input"
          placeholder="${getMessage('emailPlaceholder')}"
          style="
            width: 100%;
            padding: 15px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #e0e0e0;
            font-size: 16px;
            margin-bottom: 20px;
            box-sizing: border-box;
          "
        />

        <div id="email-error" style="
          color: #ff6b6b;
          font-size: 14px;
          margin-bottom: 15px;
          display: none;
        "></div>

        <div style="display: flex; gap: 15px;">
          <button id="email-cancel" style="
            flex: 1;
            padding: 15px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: transparent;
            color: #e0e0e0;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
          ">Cancel</button>

          <button id="email-submit" style="
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            color: #000;
            font-size: 16px;
            cursor: pointer;
            font-weight: 700;
          ">${plan === 'basic' ? getMessage('buyBasicButton') : getMessage('buyFullButton')}</button>
        </div>
      </div>
    </div>
  `;

  // Insert modal into page
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('email-modal');
  const input = document.getElementById('email-input');
  const submitBtn = document.getElementById('email-submit');
  const cancelBtn = document.getElementById('email-cancel');
  const errorDiv = document.getElementById('email-error');

  // Focus input
  input.focus();

  // Handle submit
  submitBtn.addEventListener('click', async () => {
    const email = input.value.trim();

    if (!isValidEmail(email)) {
      errorDiv.textContent = getMessage('errorInvalidEmail');
      errorDiv.style.display = 'block';
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = getMessage('processing');

    try {
      const { url } = await createCheckoutSession(email, plan);

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      errorDiv.textContent = getMessage('errorCheckoutFailed');
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = plan === 'basic' ? getMessage('buyBasicButton') : getMessage('buyFullButton');
    }
  });

  // Handle cancel
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });

  // Handle Enter key
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });

  // Handle Escape key
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get all buy buttons
  const buyButtons = document.querySelectorAll('.buy-button');

  buyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const plan = this.getAttribute('data-plan');

      if (!plan) {
        console.error('No plan specified on button');
        return;
      }

      showEmailModal(plan);
    });
  });
});
