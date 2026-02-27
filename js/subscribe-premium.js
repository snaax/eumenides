// Subscribe Premium - New user flow with email verification BEFORE checkout
const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

let currentEmail = "";
let currentPlan = "basic";
let emailVerified = false;

document.addEventListener("DOMContentLoaded", function () {
  // Get DOM elements
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  const planSelect = document.getElementById("planSelect");
  const emailInput = document.getElementById("emailInput");
  const sendCodeBtn = document.getElementById("sendCodeBtn");
  const step1Status = document.getElementById("step1Status");

  // Pre-fill email from URL parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get("email");
  if (emailParam) {
    emailInput.value = emailParam;
    currentEmail = emailParam;
  }

  const emailDisplay = document.getElementById("emailDisplay");
  const codeInput = document.getElementById("codeInput");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resendCodeBtn = document.getElementById("resendCodeBtn");
  const step2Status = document.getElementById("step2Status");

  const verifiedEmail = document.getElementById("verifiedEmail");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const step3Status = document.getElementById("step3Status");

  // Step 1: Send verification code
  sendCodeBtn.addEventListener("click", async function () {
    const email = emailInput.value.trim();
    const plan = planSelect.value;

    if (!email) {
      showStatus(step1Status, "Please enter your email address", "error");
      return;
    }

    if (!validateEmail(email)) {
      showStatus(step1Status, "Please enter a valid email address", "error");
      return;
    }

    currentEmail = email;
    currentPlan = plan;

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = "Sending code...";

    try {
      const response = await fetch(`${API_URL}/api/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - move to step 2
        showStatus(
          step1Status,
          "✅ Verification code sent! Check your email.",
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
        showStatus(step1Status, data.error || "Failed to send code", "error");
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = "📧 Send Verification Code";
      }
    } catch (error) {
      console.error("Send code error:", error);
      showStatus(
        step1Status,
        "Network error. Please check your connection and try again.",
        "error"
      );
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = "📧 Send Verification Code";
    }
  });

  // Step 2: Verify code
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
      showStatus(step2Status, "Please enter the verification code", "error");
      return;
    }

    if (code.length !== 6) {
      showStatus(step2Status, "Code must be 6 digits", "error");
      return;
    }

    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = "Verifying...";

    try {
      const response = await fetch(`${API_URL}/api/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, code }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.verified) {
        // Success! Email verified
        emailVerified = true;
        showStatus(
          step2Status,
          "✅ Email verified! Proceeding to checkout...",
          "success"
        );

        setTimeout(() => {
          step2.classList.add("hidden");
          step3.classList.remove("hidden");
          verifiedEmail.textContent = currentEmail;
        }, 1500);
      } else {
        // Error from server
        showStatus(step2Status, data.error || "Invalid code", "error");
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.textContent = "✅ Verify Email";
      }
    } catch (error) {
      console.error("Verify code error:", error);
      showStatus(
        step2Status,
        "Network error. Please try again.",
        "error"
      );
      verifyCodeBtn.disabled = false;
      verifyCodeBtn.textContent = "✅ Verify Email";
    }
  }

  // Resend code
  resendCodeBtn.addEventListener("click", async function () {
    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent = "Sending...";

    try {
      const response = await fetch(`${API_URL}/api/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(
          step2Status,
          "✅ New code sent! Check your email.",
          "success"
        );
        codeInput.value = "";
        codeInput.focus();
      } else {
        showStatus(step2Status, data.error || "Failed to resend code", "error");
      }
    } catch (error) {
      console.error("Resend code error:", error);
      showStatus(step2Status, "Network error", "error");
    } finally {
      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent = "🔄 Resend Code";
    }
  });

  // Step 3: Proceed to Stripe checkout
  checkoutBtn.addEventListener("click", async function () {
    if (!emailVerified) {
      showStatus(step3Status, "Email not verified", "error");
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Creating checkout session...";

    try {
      // Create checkout session
      const response = await fetch(`${API_URL}/api/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentEmail,
          extensionId: chrome.runtime.id,
          plan: currentPlan,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to checkout.html which will open Stripe and poll for completion
        window.location.href = `/html/checkout.html?email=${encodeURIComponent(currentEmail)}&plan=${currentPlan}`;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      showStatus(
        step3Status,
        "Failed to create checkout: " + error.message,
        "error"
      );
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "🚀 Proceed to Stripe Checkout";
    }
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
