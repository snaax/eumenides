// Checkout page - handles Stripe payment flow
const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

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

        // Save to extension storage
        await chrome.storage.sync.set({
          premium: true,
          premiumEmail: email,
          premiumPlan: data.plan,
          premiumUntil: data.expiresAt,
          subscriptionCanceled: data.subscriptionCanceled || false,
          dailyLimit: data.plan === "full" ? 999999 : 15,
        });

        document
          .getElementById("goto-premium")
          .addEventListener("click", () => {
            window.location.href = "/html/premium_page.html";
          });
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
