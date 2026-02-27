// Get Premium - Smart router that detects existing users
const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

document.addEventListener("DOMContentLoaded", function () {
  const emailInput = document.getElementById("emailInput");
  const continueBtn = document.getElementById("continueBtn");
  const status = document.getElementById("status");
  const loading = document.getElementById("loading");

  // Allow Enter key to continue
  emailInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      checkEmailAndRedirect();
    }
  });

  continueBtn.addEventListener("click", function () {
    checkEmailAndRedirect();
  });

  async function checkEmailAndRedirect() {
    const email = emailInput.value.trim();

    if (!email) {
      showStatus("Please enter your email address", "error");
      return;
    }

    if (!validateEmail(email)) {
      showStatus("Please enter a valid email address", "error");
      return;
    }

    // Hide button, show loading
    continueBtn.classList.add("hidden");
    status.classList.add("hidden");
    loading.classList.remove("hidden");

    try {
      // Check if user exists and has active subscription
      const response = await fetch(`${API_URL}/api/check-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.premium) {
        // User exists and has active subscription
        // Redirect to reactivation flow (connect existing account)
        console.log("Existing user detected, redirecting to reactivation...");
        window.location.href = `reactivate-premium.html?email=${encodeURIComponent(email)}`;
      } else {
        // New user or expired subscription
        // Redirect to new subscription flow
        console.log("New user detected, redirecting to subscription...");
        window.location.href = `subscribe-premium.html?email=${encodeURIComponent(email)}`;
      }
    } catch (error) {
      console.error("Check status error:", error);

      // On error, assume new user and redirect to subscription
      // (safer to assume new user than to block them)
      console.log("Error checking status, assuming new user...");
      window.location.href = `subscribe-premium.html?email=${encodeURIComponent(email)}`;
    }
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.classList.remove("hidden");
    loading.classList.add("hidden");
    continueBtn.classList.remove("hidden");
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});
