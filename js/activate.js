// Activate premium - auto from URL params or check existing premium
const API_BASE_URL = window.EUMENIDES_CONFIG?.apiUrl;

window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success");
  const session_id = urlParams.get("session_id");
  const key = urlParams.get("key");
  const plan = urlParams.get("plan");
  const email = urlParams.get("email");
  const expires = urlParams.get("expires");
  const canceled = urlParams.get("canceled") === "true";

  const spinner = document.getElementById("spinner");
  const statusText = document.getElementById("statusText");

  // NEW: If coming from Stripe checkout, poll for activation
  if (success === "true" && session_id) {
    console.log("Activation from Stripe checkout, session:", session_id);
    await pollForActivation(session_id, spinner, statusText);
    return;
  }

  if (key && plan && email) {
    // Auto-activate from URL parameters (from checkout redirect)
    console.log("Auto-activating from URL parameters");

    try {
      await chrome.storage.sync.set({
        premium: true,
        premiumKey: key,
        premiumPlan: plan,
        premiumEmail: email,
        premiumUntil: expires,
        subscriptionCanceled: canceled,
        dailyLimit: plan === "full" ? 999999 : plan === "basic" ? 15 : 5,
      });

      spinner.style.display = "none";
      statusText.textContent = `✅ Success! Your ${plan === "full" ? "Full" : "Basic"} plan has been activated!`;
      showMessage("Redirecting to premium page...", "success");

      // Redirect to premium page after 2 seconds
      setTimeout(() => {
        window.location.href = "/html/premium_page.html";
      }, 2000);
    } catch (error) {
      console.error("Error activating:", error);
      spinner.style.display = "none";
      statusText.textContent = "Activation failed";
      showMessage(
        "Failed to activate. Please try again from the premium page.",
        "error",
      );
    }
  } else {
    // No URL params - check if user already has premium in storage
    const storage = await chrome.storage.sync.get([
      "premium",
      "premiumKey",
      "premiumPlan",
    ]);

    if (storage.premium && storage.premiumKey) {
      // User already activated
      spinner.style.display = "none";
      statusText.textContent = `Already activated: ${storage.premiumPlan === "full" ? "Full" : "Basic"} Plan`;
      showMessage("Your premium is already active. Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "/html/premium_page.html";
      }, 2000);
    } else {
      // User doesn't have URL params and no premium - redirect to premium page
      spinner.style.display = "none";
      statusText.textContent = "No activation data found";
      showMessage(
        "Please complete checkout from the premium page to activate.",
        "error",
      );

      setTimeout(() => {
        window.location.href = "/html/premium_page.html";
      }, 3000);
    }
  }
});

function showMessage(text, type) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.className = `message ${type}`;
  message.style.display = "block";
}

/**
 * Poll backend to check if subscription is activated
 * Stripe webhooks are async, so we need to wait for it
 */
async function pollForActivation(session_id, spinner, statusText) {
  let attempts = 0;
  const maxAttempts = 20; // Poll for up to 20 seconds

  const poll = async () => {
    attempts++;
    statusText.textContent = `Checking activation status... (${attempts}/${maxAttempts})`;

    try {
      // Get email from Chrome storage (set during checkout)
      const storage = await chrome.storage.sync.get(["lastCheckoutEmail"]);
      const email = storage.lastCheckoutEmail;

      if (!email) {
        throw new Error(
          "Email not found. Please try activating from premium page.",
        );
      }

      // Check premium status
      const response = await fetch(`${API_BASE_URL}/api/check-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log("Check status response:", data);

      if (data.premium) {
        // Premium activated!
        spinner.style.display = "none";
        statusText.textContent = `✅ Success! Your ${data.plan === "full" ? "Full" : "Basic"} plan is active!`;
        showMessage("Premium activated successfully!", "success");

        // Save to extension storage
        await chrome.storage.sync.set({
          premium: true,
          premiumEmail: email,
          premiumPlan: data.plan,
          premiumUntil: data.expiresAt,
          subscriptionCanceled: data.subscriptionCanceled || false,
          dailyLimit: data.plan === "full" ? 999999 : 15,
        });

        // Redirect to premium page
        setTimeout(() => {
          window.location.href = "/html/premium_page.html";
        }, 2000);
      } else if (attempts < maxAttempts) {
        // Not activated yet, try again in 1 second
        setTimeout(poll, 1000);
      } else {
        // Timeout - webhook might have failed
        spinner.style.display = "none";
        statusText.textContent = "⚠️ Activation taking longer than expected";
        showMessage(
          "Please check your email or contact support. Your payment was received.",
          "error",
        );
      }
    } catch (error) {
      console.error("Polling error:", error);

      if (attempts < maxAttempts) {
        setTimeout(poll, 1000);
      } else {
        spinner.style.display = "none";
        statusText.textContent = "❌ Activation failed";
        showMessage(
          error.message || "Failed to check activation status",
          "error",
        );
      }
    }
  };

  // Start polling
  poll();
}
