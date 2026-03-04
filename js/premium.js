// Premium page functionality with multi-tier support and i18n

// Get API URL from config
const API_BASE_URL = window.EUMENIDES_CONFIG?.apiUrl;

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
  const id = chrome.runtime.id;
  console.log("Extension ID:", id);
  return id;
}

// Create checkout session
async function createCheckoutSession(email, plan) {
  try {
    const extensionId = getExtensionId();
    console.log("Creating checkout with:", { email, extensionId, plan });

    const response = await fetch(`${API_BASE_URL}/api/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        extensionId: extensionId,
        plan: plan,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Return error details from server
      throw new Error(data.error || "Failed to create checkout session");
    }

    console.log("Checkout session created:", data);
    return data;
  } catch (error) {
    console.error("Error creating checkout session:", error);
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
        ">${getMessage("enterEmail")}</h2>

        <input
          type="email"
          id="email-input"
          placeholder="${getMessage("emailPlaceholder")}"
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
          ">${plan === "basic" ? getMessage("buyBasicButton") : getMessage("buyFullButton")}</button>
        </div>
      </div>
    </div>
  `;

  // Insert modal into page
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("email-modal");
  const input = document.getElementById("email-input");
  const submitBtn = document.getElementById("email-submit");
  const cancelBtn = document.getElementById("email-cancel");
  const errorDiv = document.getElementById("email-error");

  // Focus input
  input.focus();

  // Handle submit
  submitBtn.addEventListener("click", async () => {
    const email = input.value.trim();

    if (!isValidEmail(email)) {
      errorDiv.textContent = getMessage("errorInvalidEmail");
      errorDiv.style.display = "block";
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = getMessage("processing");

    try {
      const { url } = await createCheckoutSession(email, plan);

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      // Show the specific error message from the server
      errorDiv.textContent = error.message || getMessage("errorCheckoutFailed");
      errorDiv.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent =
        plan === "basic"
          ? getMessage("buyBasicButton")
          : getMessage("buyFullButton");
    }
  });

  // Handle cancel
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });

  // Handle Enter key
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitBtn.click();
    }
  });

  // Handle Escape key
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  });
}

// Cancel subscription — opens Stripe Customer Portal
async function cancelSubscription() {
  const result = await chrome.storage.sync.get(["premiumEmail"]);

  if (!result.premiumEmail) {
    alert(getMessage("noEmailError") || "No email found. Please contact support.");
    return;
  }

  const cancelBtn = document.getElementById("cancelSubscriptionBtn");
  const originalText = cancelBtn.textContent;
  cancelBtn.disabled = true;
  cancelBtn.textContent = getMessage("loadingPortal") || "Loading...";

  try {
    const response = await fetch(`${API_BASE_URL}/api/create-portal-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: result.premiumEmail }),
    });

    const data = await response.json();

    if (data.url) {
      const portalTab = window.open(data.url, "_blank");
      // Refresh status display when user returns from portal
      const onFocus = async () => {
        window.removeEventListener("focus", onFocus);
        if (portalTab && !portalTab.closed) portalTab.close();
        await displayPremiumStatus();
      };
      window.addEventListener("focus", onFocus);
    } else {
      throw new Error(data.error || "Failed to create portal session");
    }
  } catch (error) {
    console.error("Error opening portal:", error);
    alert(getMessage("portalError") || "Error opening billing portal. Please try again.");
  } finally {
    cancelBtn.disabled = false;
    cancelBtn.textContent = originalText;
  }
}

// Upgrade existing subscription to a different plan (handles proration via Stripe)
async function handleUpgrade(button, newPlan) {
  const result = await chrome.storage.sync.get(["premiumEmail"]);

  if (!result.premiumEmail) {
    alert(getMessage("noEmailError") || "No email found. Please contact support.");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = getMessage("loadingPortal") || "Loading...";

  try {
    const response = await fetch(`${API_BASE_URL}/api/upgrade-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: result.premiumEmail, newPlan }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Upgrade failed");
    }

    // Update storage with new plan
    await chrome.storage.sync.set({
      premiumPlan: newPlan,
      dailyLimit: newPlan === "full" ? 999999 : 15,
    });

    const successKey = newPlan === "full" ? "upgradeSuccess" : "downgradeSuccess";
    alert(getMessage(successKey) || `✅ Abonnement mis à jour vers ${newPlan === "full" ? "Full" : "Basic"} !`);
    await displayPremiumStatus();
  } catch (error) {
    console.error("Upgrade error:", error);
    alert(getMessage("upgradeError") || "Échec de la mise à jour. Veuillez réessayer.");
    button.disabled = false;
    button.textContent = originalText;
  }
}

// Reactivate subscription — opens Stripe Customer Portal
async function reactivateSubscription() {
  const result = await chrome.storage.sync.get(["premiumEmail"]);

  if (!result.premiumEmail) {
    alert(getMessage("noEmailError") || "No email found. Please contact support.");
    return;
  }

  const reactivateBtn = document.getElementById("reactivateSubscriptionBtn");
  const originalText = reactivateBtn.textContent;
  reactivateBtn.disabled = true;
  reactivateBtn.textContent = getMessage("loadingPortal") || "Loading...";

  try {
    const response = await fetch(`${API_BASE_URL}/api/create-portal-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: result.premiumEmail }),
    });

    const data = await response.json();

    if (data.url) {
      const portalTab = window.open(data.url, "_blank");
      const onFocus = async () => {
        window.removeEventListener("focus", onFocus);
        if (portalTab && !portalTab.closed) portalTab.close();
        await displayPremiumStatus();
      };
      window.addEventListener("focus", onFocus);
    } else {
      throw new Error(data.error || "Failed to create portal session");
    }
  } catch (error) {
    console.error("Error opening portal:", error);
    alert(getMessage("portalError") || "Error opening billing portal. Please try again.");
  } finally {
    reactivateBtn.disabled = false;
    reactivateBtn.textContent = originalText;
  }
}

// Display premium status
async function displayPremiumStatus() {
  try {
    // First check chrome storage
    const result = await chrome.storage.sync.get([
      "premiumPlan",
      "premiumEmail",
      "premiumUntil",
      "subscriptionCanceled",
    ]);

    console.log("Premium status from storage:", result);

    const statusBanner = document.getElementById("premiumStatus");
    const statusTitle = document.getElementById("statusTitle");
    const statusPlan = document.getElementById("statusPlan");
    const statusDetails = document.getElementById("statusDetails");
    const cancelBtn = document.getElementById("cancelSubscriptionBtn");
    const reactivateBtn = document.getElementById("reactivateSubscriptionBtn");

    const hasPremium = result.premiumPlan && result.premiumPlan !== "free";

    if (hasPremium) {
      // User has premium - show status
      statusBanner.style.display = "block";
      statusBanner.classList.remove("free");
      statusTitle.classList.remove("free");

      const planName =
        result.premiumPlan === "full"
          ? getMessage("planFullName") || "Full Plan"
          : getMessage("planBasicName") || "Basic Plan";

      statusTitle.textContent =
        getMessage("currentPlan") || "Your Current Plan";
      statusPlan.innerHTML = `<span style="font-size: 32px;">${result.premiumPlan === "full" ? "⭐" : "✨"}</span> ${planName}`;

      if (result.premiumUntil) {
        const expiryDate = new Date(result.premiumUntil);
        const formattedDate = expiryDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        if (result.subscriptionCanceled) {
          const prefix = getMessage("subscriptionCanceledUntil") || "Annulé – actif jusqu'au";
          statusDetails.innerHTML = `${prefix} <strong>${formattedDate}</strong> • ${result.premiumEmail || ""}`;
          cancelBtn.style.display = "none";
          reactivateBtn.style.display = "inline-block";
        } else {
          const prefix = getMessage("subscriptionActiveUntil") || "Actif jusqu'au";
          statusDetails.innerHTML = `${prefix} <strong>${formattedDate}</strong> • ${result.premiumEmail || ""}`;
          cancelBtn.style.display = "inline-block";
          reactivateBtn.style.display = "none";
        }
      } else {
        statusDetails.textContent = result.premiumEmail || getMessage("premiumActive") || "Premium actif";
        cancelBtn.style.display = "inline-block";
      }
    } else {
      // User is on free plan
      statusBanner.style.display = "block";
      statusBanner.classList.add("free");
      statusTitle.classList.add("free");

      statusTitle.textContent =
        getMessage("currentPlan") || "Your Current Plan";
      statusPlan.innerHTML =
        `<span style="font-size: 32px;">🆓</span> ${getMessage("planFreeName") || "Plan Gratuit"}`;
      statusDetails.textContent = getMessage("upgradeToUnlock") || "Passez à Premium pour débloquer toutes les fonctionnalités";
      cancelBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error displaying premium status:", error);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Display premium status
  await displayPremiumStatus();

  // Check if user already has premium - if so, disable buy buttons
  const storage = await chrome.storage.sync.get(["premiumPlan"]);
  const buyButtons = document.querySelectorAll(".buy-button");

  buyButtons.forEach((button) => {
    const buttonPlan = button.getAttribute("data-plan");

    // If user has premium already
    const hasPremium = storage.premiumPlan && storage.premiumPlan !== "free";
    if (hasPremium) {
      // Disable buy buttons for plans at or below current plan
      if (storage.premiumPlan === "full") {
        if (buttonPlan === "full") {
          // Current plan
          button.disabled = true;
          button.style.opacity = "0.5";
          button.style.cursor = "not-allowed";
          button.textContent = getMessage("currentPlanButton") || "✓ Plan actuel";
        } else if (buttonPlan === "basic") {
          // Downgrade option
          button.textContent = getMessage("downgradeToBasic") || "⬇️ Passer à Basic";
          button.addEventListener("click", async function () {
            await handleUpgrade(button, "basic");
          });
        } else {
          // Free plan — can't downgrade to free via button
          button.disabled = true;
          button.style.opacity = "0.5";
          button.style.cursor = "not-allowed";
          button.textContent = getMessage("notAvailable") || "Non disponible";
        }
      } else if (storage.premiumPlan === "basic" && buttonPlan === "basic") {
        // Basic plan user - disable basic button
        button.disabled = true;
        button.style.opacity = "0.5";
        button.style.cursor = "not-allowed";
        button.textContent = getMessage("currentPlanButton") || "✓ Plan actuel";
      } else if (storage.premiumPlan === "basic" && buttonPlan === "full") {
        // Basic plan user can upgrade to full
        button.textContent = getMessage("upgradeToFull") || "⬆️ Passer à Full";
        button.addEventListener("click", async function () {
          await handleUpgrade(button, "full");
        });
      }
    } else {
      // No premium - allow checkout for all plans
      button.addEventListener("click", function () {
        const plan = this.getAttribute("data-plan");

        if (!plan) {
          console.error("No plan specified on button");
          return;
        }

        showEmailModal(plan);
      });
    }
  });

  // Cancel subscription button
  const cancelBtn = document.getElementById("cancelSubscriptionBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelSubscription);
  }

  // Reactivate subscription button (shown when subscription is canceled but still active)
  const reactivateBtn = document.getElementById("reactivateSubscriptionBtn");
  if (reactivateBtn) {
    reactivateBtn.addEventListener("click", reactivateSubscription);
  }

  // Add activate button for users who completed checkout but haven't activated
  await addActivateButtonIfNeeded();
});

// Add activate button if user doesn't have premium yet
async function addActivateButtonIfNeeded() {
  const result = await chrome.storage.sync.get(["premiumPlan", "premiumEmail"]);

  console.log("Checking if activation form needed:", result);

  // Show activation form if:
  // - No premium at all, OR
  // - Has premium plan but missing email (incomplete activation)
  const hasPremium = result.premiumPlan && result.premiumPlan !== "free";
  const needsActivation = !hasPremium || !result.premiumEmail;

  if (!needsActivation) {
    console.log("User fully activated, skipping activation form");
    return;
  }

  console.log("User needs activation - showing form (incomplete data)");

  // Add activate section ABOVE pricing cards (before premium status banner)
  const header = document.querySelector(".header");

  if (!header) {
    console.error("Header element not found!");
    return;
  }

  console.log("Adding activation form to page");

  const activateHTML = `
    <div id="activateSection" style="
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.2) 100%);
      border: 2px solid rgba(74, 222, 128, 0.5);
      border-radius: 16px;
      padding: 30px;
      margin: 30px auto;
      max-width: 600px;
      text-align: center;
    ">
      <h2 style="font-size: 24px; margin-bottom: 10px; color: #4ade80;">🎉 Checkout Complete!</h2>
      <p style="margin-bottom: 20px; opacity: 0.9;">Enter your email to activate your premium subscription:</p>
      <input
        type="email"
        id="activateEmailInput"
        placeholder="your.email@example.com"
        style="
          width: 100%;
          max-width: 400px;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          color: #e0e0e0;
          font-size: 16px;
          margin-bottom: 15px;
        "
      />
      <br>
      <button
        id="quickActivateBtn"
        style="
          padding: 12px 30px;
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: #000;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        "
      >Activate Premium</button>
      <div id="activateMessage" style="margin-top: 15px; display: none;"></div>
    </div>
  `;

  // Insert after header, before everything else
  header.insertAdjacentHTML("afterend", activateHTML);

  document
    .getElementById("quickActivateBtn")
    .addEventListener("click", async () => {
      const email = document.getElementById("activateEmailInput").value.trim();
      const btn = document.getElementById("quickActivateBtn");
      const message = document.getElementById("activateMessage");

      if (!email || !email.includes("@")) {
        message.textContent = "❌ Please enter a valid email address";
        message.style.display = "block";
        message.style.color = "#ff6b6b";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Activating...";

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/activate-by-email?email=${encodeURIComponent(email)}`,
        );
        const data = await response.json();

        if (data.success && data.tier) {
          const tier = data.tier || "basic";
          await chrome.storage.sync.set({
            premiumPlan: tier,
            premiumEmail: data.email,
            premiumUntil: data.expiresAt,
            subscriptionCanceled: data.subscriptionCanceled || false,
            dailyLimit: tier === "full" ? 999999 : tier === "basic" ? 15 : 5,
          });

          message.textContent = `✅ Success! Your ${data.plan === "full" ? "Full" : "Basic"} plan has been activated!`;
          message.style.display = "block";
          message.style.color = "#4ade80";

          // Reload the page after 1 second
          setTimeout(() => {
            location.reload();
          }, 1000);
        } else {
          message.textContent =
            "❌ " + (data.error || "No subscription found for this email");
          message.style.display = "block";
          message.style.color = "#ff6b6b";
          btn.disabled = false;
          btn.textContent = "Activate Premium";
        }
      } catch (error) {
        console.error("Error:", error);
        message.textContent = "❌ Failed to activate. Please try again.";
        message.style.display = "block";
        message.style.color = "#ff6b6b";
        btn.disabled = false;
        btn.textContent = "Activate Premium";
      }
    });
}
