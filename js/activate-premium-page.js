const API_URL = "https://eumenides-backend.vercel.app"; // Update with your actual API URL

document.addEventListener("DOMContentLoaded", function () {
  // Apply i18n translations
  applyTranslations();

  const button = document.getElementById("activateBtn");
  const status = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const emailInput = document.getElementById("emailInput");
  const planSelect = document.getElementById("planSelect");
  const manageBtn = document.getElementById("manageBtn");

  function applyTranslations() {
    // Set document title
    document.title =
      chrome.i18n.getMessage("activatePremiumTitle") ||
      "Activate Premium - Eumenides";

    // Translate all elements with data-i18n
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }

<<<<<<< HEAD
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
=======
  // Check if returning from successful payment
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("success") === "true") {
    const email = urlParams.get("email");
    if (email) {
      startPolling(email);
    }
  }

  button.addEventListener("click", async function () {
    const email = emailInput.value.trim();
    const plan = planSelect.value;

    if (!email) {
      alert(
        chrome.i18n.getMessage("enterEmailError") ||
          "Please enter your email address",
      );
      return;
    }

    if (!validateEmail(email)) {
      alert(
        chrome.i18n.getMessage("invalidEmailError") ||
          "Please enter a valid email address",
      );
      return;
    }

    button.disabled = true;
    statusText.textContent =
      chrome.i18n.getMessage("creatingCheckout") ||
      "Creating checkout session...";

    try {
      // Create checkout session
      const response = await fetch(`${API_URL}/api/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          extensionId: chrome.runtime.id,
          plan: plan,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url + `&email=${encodeURIComponent(email)}`;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      statusText.textContent =
        chrome.i18n.getMessage("checkoutError") ||
        "Error creating checkout. Please try again.";
      button.disabled = false;
    }
  });

  /**
   * Poll for premium activation after payment
   */
  async function startPolling(email) {
    statusText.textContent =
      chrome.i18n.getMessage("activatingPremium") ||
      "Activating premium subscription...";
    button.style.display = "none";

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total (2s interval)

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/check-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.premium) {
          clearInterval(pollInterval);

          // Activate premium in extension
          chrome.storage.sync.set(
            {
              premium: true,
              premiumEmail: email,
              premiumTier: data.tier,
              premiumExpiresAt: data.expiresAt,
              premiumSince: Date.now(),
              postsToday: 0,
              dailyLimit: 999999,
            },
            () => {
              status.classList.add("success");
              statusText.textContent =
                chrome.i18n.getMessage("premiumActivated") ||
                "✅ Premium activated successfully!";

              // Show manage subscription button
              const manageBtn = document.getElementById("manageBtn");
              if (manageBtn) {
                manageBtn.style.display = "inline-block";
              }

              console.log("Premium activated successfully!");
            },
          );
        } else if (attempts++ >= maxAttempts) {
          clearInterval(pollInterval);
          statusText.textContent =
            chrome.i18n.getMessage("activationTimeout") ||
            "Activation taking longer than expected. Please check your email and try again.";
          button.disabled = false;
          button.style.display = "inline-block";
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    }, 2000);
  }

  /**
   * Simple email validation
   */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Handle manage subscription button
   */
  if (manageBtn) {
    manageBtn.addEventListener("click", async function () {
      // Get stored email
      chrome.storage.sync.get(["premiumEmail"], async (data) => {
        const email = data.premiumEmail;

        if (!email) {
          alert(
            chrome.i18n.getMessage("noEmailError") ||
              "No email found. Please contact support.",
          );
          return;
        }

        manageBtn.disabled = true;
        manageBtn.textContent =
          chrome.i18n.getMessage("loadingPortal") || "Loading...";

        try {
          const response = await fetch(`${API_URL}/api/create-portal-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (data.url) {
            // Open Stripe Customer Portal
            window.open(data.url, "_blank");
            manageBtn.disabled = false;
            manageBtn.textContent =
              chrome.i18n.getMessage("manageSubscription") ||
              "⚙️ Manage Subscription";
          } else {
            throw new Error(data.error || "Failed to create portal session");
          }
        } catch (error) {
          console.error("Portal error:", error);
          alert(
            chrome.i18n.getMessage("portalError") ||
              "Error opening billing portal. Please try again.",
          );
          manageBtn.disabled = false;
          manageBtn.textContent =
            chrome.i18n.getMessage("manageSubscription") ||
            "⚙️ Manage Subscription";
        }
      });
    });
  }

  // Check if user already has premium and show manage button
  chrome.storage.sync.get(["premium", "premiumEmail"], (data) => {
    if (data.premium && data.premiumEmail) {
      if (manageBtn) {
        manageBtn.style.display = "inline-block";
      }
      statusText.textContent =
        chrome.i18n.getMessage("alreadyPremium") ||
        "✅ You already have premium!";
      status.classList.add("success");
    }
  });
>>>>>>> main
});
