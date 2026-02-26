const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

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
});
