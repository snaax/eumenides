// Checkout page - handles Stripe payment flow
const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

if (!API_URL) {
  console.error("CRITICAL: API_URL not configured! Please run: npm run build:config");
  alert("Configuration error. Please contact support.");
  throw new Error("API_URL not configured");
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  const plan = urlParams.get("plan") || "basic";

  const openCheckoutBtn = document.getElementById("open-checkout-btn");
  const pollingStatus = document.getElementById("polling-status");
  const statusText = document.getElementById("status-text");
  const successArea = document.getElementById("success-area");
  const instructions = document.getElementById("instructions");
  const statusArea = document.getElementById("status-area");

  if (!email) {
    alert("No email provided. Please start from the premium page.");
    window.location.href = "/html/activate-premium.html";
    return;
  }

  let stripeTab = null;

  openCheckoutBtn.addEventListener("click", async () => {
    openCheckoutBtn.disabled = true;
    openCheckoutBtn.textContent = "Creating checkout session...";

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
        // Open Stripe in new tab and keep reference
        stripeTab = window.open(data.url, "_blank");

        // Start polling for completion
        instructions.style.display = "none";
        statusArea.style.display = "none";
        pollingStatus.style.display = "block";

        startPolling(email, plan, stripeTab);
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to create checkout: " + error.message);
      openCheckoutBtn.disabled = false;
      openCheckoutBtn.textContent = "🚀 Open Stripe Checkout";
    }
  });
});

async function startPolling(email, plan, stripeTab) {
  const pollingStatus = document.getElementById("polling-status");
  const statusText = document.getElementById("status-text");
  const successArea = document.getElementById("success-area");

  let attempts = 0;
  const maxAttempts = 60; // Poll for up to 60 seconds

  const poll = async () => {
    attempts++;
    statusText.textContent = `Checking for payment... (${attempts}/${maxAttempts})`;

    try {
      const response = await fetch(`${API_URL}/api/check-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.premium) {
        // Close the Stripe tab if it's still open
        if (stripeTab && !stripeTab.closed) {
          stripeTab.close();
        }

        // Premium activated!
        pollingStatus.style.display = "none";
        successArea.style.display = "block";

        // Save to extension storage (using premiumPlan field only)
        const plan = data.tier || data.plan || "basic";
        await chrome.storage.sync.set({
          premiumPlan: plan,
          premiumEmail: email,
          premiumUntil: data.expiresAt,
          subscriptionCanceled: data.subscriptionCanceled || false,
          dailyLimit: plan === "full" ? 999999 : plan === "basic" ? 15 : 5,
        });

        // Auto-redirect to premium page after 2 seconds
        setTimeout(() => {
          window.location.href = "/html/premium_page.html";
        }, 2000);
      } else if (attempts < maxAttempts) {
        // Not activated yet, try again in 1 second
        setTimeout(poll, 1000);
      } else {
        // Timeout
        statusText.textContent =
          "⚠️ Timeout - Please contact support if payment was completed";
      }
    } catch (error) {
      console.error("Polling error:", error);
      if (attempts < maxAttempts) {
        setTimeout(poll, 1000);
      } else {
        statusText.textContent = "❌ Error checking status";
      }
    }
  };

  // Start polling
  poll();
}
