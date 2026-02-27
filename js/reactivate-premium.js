// Reactivate Premium - Allow existing subscribers to activate on new devices
const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

let currentEmail = "";

document.addEventListener("DOMContentLoaded", function () {
  // Apply i18n translations
  applyTranslations();

  // Get DOM elements
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  const emailInput = document.getElementById("emailInput");
  const requestCodeBtn = document.getElementById("requestCodeBtn");
  const emailStatus = document.getElementById("emailStatus");

  const emailDisplay = document.getElementById("emailDisplay");
  const codeInput = document.getElementById("codeInput");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resendCodeBtn = document.getElementById("resendCodeBtn");
  const codeStatus = document.getElementById("codeStatus");

  const goToDashboardBtn = document.getElementById("goToDashboardBtn");

  // Pre-fill email from URL parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get("email");
  if (emailParam) {
    emailInput.value = emailParam;
    currentEmail = emailParam;
  }

  // Apply translations
  function applyTranslations() {
    document.title =
      chrome.i18n.getMessage("reactivateTitle") ||
      "Activate Subscription - Eumenides";

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const message = chrome.i18n.getMessage(key);
      if (message) {
        if (element.tagName === "INPUT" && element.placeholder) {
          // Don't translate placeholders that are examples (like email addresses)
        } else {
          element.textContent = message;
        }
      }
    });
  }

  // Step 1: Request activation code
  requestCodeBtn.addEventListener("click", async function () {
    const email = emailInput.value.trim();

    if (!email) {
      showStatus(
        emailStatus,
        chrome.i18n.getMessage("enterEmailError") ||
          "Please enter your email address",
        "error"
      );
      return;
    }

    if (!validateEmail(email)) {
      showStatus(
        emailStatus,
        chrome.i18n.getMessage("invalidEmailError") ||
          "Please enter a valid email address",
        "error"
      );
      return;
    }

    currentEmail = email;
    requestCodeBtn.disabled = true;
    requestCodeBtn.textContent =
      chrome.i18n.getMessage("sendingCode") || "Sending code...";

    try {
      const response = await fetch(`${API_URL}/api/request-activation-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - move to step 2
        showStatus(
          emailStatus,
          chrome.i18n.getMessage("codeSentSuccess") ||
            "✅ Activation code sent! Check your email.",
          "success"
        );

        setTimeout(() => {
          step1.classList.add("hidden");
          step2.classList.remove("hidden");
          emailDisplay.textContent = email;
          codeInput.focus();
        }, 1500);
      } else {
        // Error from server
        showStatus(emailStatus, data.error || "Failed to send code", "error");
        requestCodeBtn.disabled = false;
        requestCodeBtn.textContent =
          chrome.i18n.getMessage("requestCodeButton") ||
          "📧 Send Activation Code";
      }
    } catch (error) {
      console.error("Request code error:", error);
      showStatus(
        emailStatus,
        chrome.i18n.getMessage("networkError") ||
          "Network error. Please check your connection and try again.",
        "error"
      );
      requestCodeBtn.disabled = false;
      requestCodeBtn.textContent =
        chrome.i18n.getMessage("requestCodeButton") ||
        "📧 Send Activation Code";
    }
  });

  // Step 2: Verify activation code
  verifyCodeBtn.addEventListener("click", async function () {
    await verifyCode();
  });

  // Allow Enter key to verify code
  codeInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      verifyCode();
    }
  });

  // Auto-format code input (numbers only)
  codeInput.addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9]/g, "");
  });

  async function verifyCode() {
    const code = codeInput.value.trim();

    if (!code) {
      showStatus(
        codeStatus,
        chrome.i18n.getMessage("enterCodeError") || "Please enter the code",
        "error"
      );
      return;
    }

    if (code.length !== 6) {
      showStatus(
        codeStatus,
        chrome.i18n.getMessage("invalidCodeLength") ||
          "Code must be 6 digits",
        "error"
      );
      return;
    }

    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent =
      chrome.i18n.getMessage("verifyingCode") || "Verifying...";

    try {
      const response = await fetch(`${API_URL}/api/verify-activation-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, code }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.premium) {
        // Success! Activate premium
        showStatus(
          codeStatus,
          chrome.i18n.getMessage("codeVerifiedSuccess") ||
            "✅ Code verified! Activating premium...",
          "success"
        );

        // Save to extension storage
        const plan = data.tier || "basic";
        await chrome.storage.sync.set({
          premiumPlan: plan,
          premiumEmail: currentEmail,
          premiumUntil: data.expiresAt,
          subscriptionCanceled: data.subscriptionCanceled || false,
          dailyLimit: plan === "full" ? 999999 : plan === "basic" ? 15 : 5,
        });

        // Move to success step
        setTimeout(() => {
          step2.classList.add("hidden");
          step3.classList.remove("hidden");
        }, 1500);
      } else {
        // Error from server
        showStatus(codeStatus, data.error || "Invalid code", "error");
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.textContent =
          chrome.i18n.getMessage("verifyCodeButton") || "✅ Verify Code";
      }
    } catch (error) {
      console.error("Verify code error:", error);
      showStatus(
        codeStatus,
        chrome.i18n.getMessage("networkError") ||
          "Network error. Please try again.",
        "error"
      );
      verifyCodeBtn.disabled = false;
      verifyCodeBtn.textContent =
        chrome.i18n.getMessage("verifyCodeButton") || "✅ Verify Code";
    }
  }

  // Resend code
  resendCodeBtn.addEventListener("click", async function () {
    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent =
      chrome.i18n.getMessage("sendingCode") || "Sending...";

    try {
      const response = await fetch(`${API_URL}/api/request-activation-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(
          codeStatus,
          chrome.i18n.getMessage("codeResentSuccess") ||
            "✅ New code sent! Check your email.",
          "success"
        );
        codeInput.value = "";
        codeInput.focus();
      } else {
        showStatus(codeStatus, data.error || "Failed to resend code", "error");
      }
    } catch (error) {
      console.error("Resend code error:", error);
      showStatus(
        codeStatus,
        chrome.i18n.getMessage("networkError") || "Network error",
        "error"
      );
    } finally {
      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent =
        chrome.i18n.getMessage("resendCodeButton") || "🔄 Resend Code";
    }
  });

  // Go to dashboard
  goToDashboardBtn.addEventListener("click", function () {
    window.location.href = "/html/dashboard.html";
  });

  // Helper functions
  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.classList.remove("hidden");
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});
