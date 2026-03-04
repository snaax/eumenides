console.log("Popup script loaded");

// API URL configuration - MUST be set via config-generated.js
const API_URL = window.EUMENIDES_CONFIG?.apiUrl;

if (!API_URL) {
  console.error("CRITICAL: API_URL not configured! Please set apiUrl in config.json");
}

// Sync premium status from API and refresh popup subscription UI
async function syncAndRefreshPremiumStatus(email) {
  try {
    const response = await fetch(`${API_URL}/api/check-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();

    if (data.premium) {
      const tier = data.tier || "basic";
      await chrome.storage.sync.set({
        premiumPlan: tier,
        premiumEmail: email,
        premiumUntil: data.expiresAt,
        subscriptionCanceled: data.subscriptionCanceled || false,
        dailyLimit: tier === "full" ? 999999 : 15,
      });
    } else {
      await chrome.storage.sync.set({
        premiumPlan: "free",
        premiumUntil: null,
        subscriptionCanceled: false,
        dailyLimit: 5,
      });
    }

    // Refresh the subscription info card
    const subscriptionInfo = document.getElementById("subscriptionInfo");
    const subscriptionPlan = document.getElementById("subscriptionPlan");
    const subscriptionExpiry = document.getElementById("subscriptionExpiry");
    const upgradeBtn = document.querySelector(".upgrade-btn");

    if (data.premium) {
      const tier = data.tier || "basic";
      const planLabel = tier === "full"
        ? (chrome.i18n.getMessage("planFullName") || "Full Plan")
        : (chrome.i18n.getMessage("planBasicName") || "Basic Plan");
      subscriptionPlan.textContent = (tier === "full" ? "⭐ " : "✨ ") + planLabel;
      if (data.expiresAt) {
        const expiry = new Date(data.expiresAt);
        const formatted = expiry.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        const key = data.subscriptionCanceled ? "subscriptionCanceledUntil" : "subscriptionActiveUntil";
        const prefix = chrome.i18n.getMessage(key) || (data.subscriptionCanceled ? "Canceled – active until" : "Active until");
        subscriptionExpiry.textContent = `${prefix} ${formatted}`;
      }
      const manageBtn = document.getElementById("manageSubscriptionBtn");
      if (data.subscriptionCanceled) {
        manageBtn.textContent = chrome.i18n.getMessage("reactivateSubscription") || "🔄 Réactiver l'abonnement";
      } else {
        manageBtn.textContent = chrome.i18n.getMessage("manageSubscription") || "⚙️ Gérer l'abonnement";
      }
      subscriptionInfo.style.display = "block";
      upgradeBtn.style.display = "none";
    } else {
      subscriptionInfo.style.display = "none";
      upgradeBtn.style.display = "block";
    }
  } catch (error) {
    console.error("Error syncing premium status:", error);
  }
}

// Update extension icon based on enabled state
function updateIcon(enabled) {
  console.log("updateIcon called with enabled:", enabled);
  const iconPath = enabled
    ? {
        16: "/icons/icon16.png",
        48: "/icons/icon48.png",
        128: "/icons/icon128.png",
      }
    : {
        16: "/icons/icon16-disabled.png",
        48: "/icons/icon48-disabled.png",
        128: "/icons/icon128-disabled.png",
      };

  console.log("Setting icon path:", iconPath);
  chrome.action.setIcon({ path: iconPath }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error setting icon:", chrome.runtime.lastError.message);
    } else {
      console.log(
        "Icon updated successfully to",
        enabled ? "enabled" : "disabled",
      );
    }
  });
}

// Apply i18n translations
function applyTranslations() {
  // Set document title
  document.title = chrome.i18n.getMessage("extName") || "Eumenides";

  // Translate all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}

// Update premium badge visibility
function updatePremiumBadge() {
  chrome.storage.sync.get(["premiumPlan"], (data) => {
    const hasPremium = data.premiumPlan && data.premiumPlan !== "free";
    document.querySelectorAll(".premium-badge").forEach((badge) => {
      badge.style.display = hasPremium ? "none" : "inline-block";
    });
  });
}

function selectMode(mode, element) {
  console.log("Selecting mode:", mode);
  document
    .querySelectorAll(".mode-option")
    .forEach((o) => o.classList.remove("selected"));
  element.classList.add("selected");
  chrome.storage.sync.set({ mode }, () => {
    console.log("Mode saved:", mode);
  });

  // Notify content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "changeMode",
            mode,
          })
          .catch(() => {
            // Tab may not have content script, ignore error
          });
      }
    });
  });
}

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, setting up event listeners");

  // Apply translations first
  applyTranslations();

  // Update premium badge
  updatePremiumBadge();

  // Toggle enable/disable
  const mainToggle = document.getElementById("mainToggle");
  console.log("Main toggle element:", mainToggle);

  mainToggle.addEventListener("click", function () {
    console.log("Toggle clicked!");
    this.classList.toggle("active");
    const enabled = this.classList.contains("active");
    console.log("Setting enabled to:", enabled);
    chrome.storage.sync.set({ enabled }, () => {
      console.log("Enabled saved:", enabled);
    });

    // Update icon based on enabled state
    updateIcon(enabled);

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "toggleEnabled",
              enabled,
            })
            .catch(() => {
              // Tab may not have content script, ignore error
            });
        }
      });
    });
  });

  // Detection toggle
  const detectionToggle = document.getElementById("detectionToggle");
  console.log("Detection toggle element:", detectionToggle);
  detectionToggle.addEventListener("click", function () {
    console.log("Detection toggle clicked!");
    this.classList.toggle("active");
    const enabled = this.classList.contains("active");
    console.log("Setting aggression detection to:", enabled);
    chrome.storage.sync.set({ aggressionDetection: enabled }, () => {
      console.log("Aggression detection saved:", enabled);
    });

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "updateSettings",
              aggressionDetection: enabled,
            })
            .catch(() => {
              // Tab may not have content script, ignore error
            });
        }
      });
    });
  });

  // Sensitivity selector with tier validation
  const sensitivitySelect = document.getElementById("sensitivitySelect");
  console.log("Sensitivity select element:", sensitivitySelect);

  sensitivitySelect.addEventListener("change", function () {
    console.log("Sensitivity changed to:", this.value);

    // Check if user has access to this sensitivity level
    chrome.storage.sync.get(["premiumPlan"], (data) => {
      const tier =
        data.premiumPlan === "full"
          ? "premium"
          : data.premiumPlan === "basic"
            ? "basic"
            : "free";

      // Validate access (using EumenidesDetector if available)
      if (
        window.EumenidesDetector &&
        !window.EumenidesDetector.isSensitivityAvailable(this.value, tier)
      ) {
        const requiredTier = window.EumenidesDetector.getRequiredTier(
          this.value,
        );
        alert(
          chrome.i18n.getMessage("sensitivityRequiresTier", [
            requiredTier.toUpperCase(),
          ]) ||
            `This sensitivity level requires ${requiredTier.toUpperCase()} subscription.`,
        );

        // Reset to previous valid value
        this.value = data.detectionSensitivity || "medium";
        return;
      }

      chrome.storage.sync.set({ detectionSensitivity: this.value }, () => {
        console.log("Detection sensitivity saved:", this.value);
      });

      // Notify content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs
              .sendMessage(tab.id, {
                action: "updateSettings",
                detectionSensitivity: this.value,
              })
              .catch(() => {
                // Tab may not have content script, ignore error
              });
          }
        });
      });
    });
  });

  // Mode selection
  document.querySelectorAll(".mode-option").forEach((option) => {
    console.log(
      "Adding listener to mode option:",
      option.getAttribute("data-mode"),
    );
    option.addEventListener("click", function () {
      console.log("Mode option clicked!");
      const mode = this.getAttribute("data-mode");

      // Check premium for delay mode
      if (mode === "delay") {
        chrome.storage.sync.get(["premiumPlan"], (data) => {
          const hasPremium = data.premiumPlan && data.premiumPlan !== "free";
          if (!hasPremium) {
            alert(chrome.i18n.getMessage("delayModeRequiresPremium"));
            return;
          }
          selectMode(mode, this);
        });
      } else {
        selectMode(mode, this);
      }
    });
  });

  // Silently sync status from API on popup open
  chrome.storage.sync.get(["premiumEmail"], (stored) => {
    if (stored.premiumEmail) {
      syncAndRefreshPremiumStatus(stored.premiumEmail);
    }
  });

  // Subscription info for premium users
  chrome.storage.sync.get(["premiumPlan", "premiumEmail", "premiumUntil", "subscriptionCanceled"], (data) => {
    const hasPremium = data.premiumPlan && data.premiumPlan !== "free";
    const subscriptionInfo = document.getElementById("subscriptionInfo");
    const subscriptionPlan = document.getElementById("subscriptionPlan");
    const subscriptionExpiry = document.getElementById("subscriptionExpiry");

    if (hasPremium) {
      subscriptionInfo.style.display = "block";

      const planLabel = data.premiumPlan === "full"
        ? (chrome.i18n.getMessage("planFullName") || "Full Plan")
        : (chrome.i18n.getMessage("planBasicName") || "Basic Plan");
      subscriptionPlan.textContent = (data.premiumPlan === "full" ? "⭐ " : "✨ ") + planLabel;

      if (data.premiumUntil) {
        const expiry = new Date(data.premiumUntil);
        const formatted = expiry.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        const key = data.subscriptionCanceled ? "subscriptionCanceledUntil" : "subscriptionActiveUntil";
        const prefix = chrome.i18n.getMessage(key) || (data.subscriptionCanceled ? "Canceled – active until" : "Active until");
        subscriptionExpiry.textContent = `${prefix} ${formatted}`;
      }

      const manageBtn = document.getElementById("manageSubscriptionBtn");
      if (data.subscriptionCanceled) {
        manageBtn.textContent = chrome.i18n.getMessage("reactivateSubscription") || "🔄 Réactiver l'abonnement";
      } else {
        manageBtn.textContent = chrome.i18n.getMessage("manageSubscription") || "⚙️ Gérer l'abonnement";
      }
    }
  });

  const manageSubscriptionBtn = document.getElementById("manageSubscriptionBtn");
  manageSubscriptionBtn.addEventListener("click", async function () {
    chrome.storage.sync.get(["premiumEmail"], async (data) => {
      if (!data.premiumEmail) return;

      manageSubscriptionBtn.disabled = true;
      manageSubscriptionBtn.textContent = chrome.i18n.getMessage("loadingPortal") || "Loading...";

      try {
        const response = await fetch(`${API_URL}/api/create-portal-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.premiumEmail }),
        });
        const result = await response.json();
        if (result.url) {
          const tab = await chrome.tabs.create({ url: result.url });
          // When portal tab closes, sync status from API and refresh UI
          chrome.tabs.onRemoved.addListener(function onPortalClosed(closedTabId) {
            if (closedTabId !== tab.id) return;
            chrome.tabs.onRemoved.removeListener(onPortalClosed);
            syncAndRefreshPremiumStatus(data.premiumEmail);
          });
        } else {
          throw new Error(result.error || "Failed");
        }
      } catch (error) {
        console.error("Portal error:", error);
        alert(chrome.i18n.getMessage("portalError") || "Error opening billing portal. Please try again.");
      } finally {
        manageSubscriptionBtn.disabled = false;
        const msg = chrome.i18n.getMessage("manageSubscription");
        manageSubscriptionBtn.textContent = msg || "⚙️ Manage Subscription";
      }
    });
  });

  // Premium upgrade
  const upgradeBtn = document.querySelector(".upgrade-btn");
  console.log("Upgrade button:", upgradeBtn);

  // Hide upgrade button if user has premium
  chrome.storage.sync.get(["premiumPlan"], (data) => {
    const hasPremium = data.premiumPlan && data.premiumPlan !== "free";
    upgradeBtn.style.display = hasPremium ? "none" : "block";
  });

  upgradeBtn.addEventListener("click", async function () {
    console.log("Upgrade button clicked!");

    // Get stored email if available
    chrome.storage.sync.get(["premiumEmail"], async (data) => {
      const storedEmail = data.premiumEmail;

      if (storedEmail) {
        // Check if user has active subscription in database
        try {
          const response = await fetch(`${API_URL}/api/check-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: storedEmail }),
          });

          const result = await response.json();

          if (result.premium) {
            // User has active subscription - redirect to reactivate page
            console.log("Existing subscription found, redirecting to reactivate page");
            chrome.tabs.create({
              url: `html/reactivate-premium.html?email=${encodeURIComponent(storedEmail)}`
            });
          } else {
            // Subscription expired or doesn't exist - redirect to subscribe page
            console.log("No active subscription, redirecting to subscribe page");
            chrome.tabs.create({ url: "html/subscribe-premium.html" });
          }
        } catch (error) {
          console.error("Error checking status:", error);
          // On error, redirect to subscribe page (safe default)
          chrome.tabs.create({ url: "html/subscribe-premium.html" });
        }
      } else {
        // No stored email - new user, redirect to subscribe page
        console.log("No stored email, redirecting to subscribe page");
        chrome.tabs.create({ url: "html/subscribe-premium.html" });
      }
    });
  });

  // Dashboard
  const dashboardBtn = document.querySelector(".dashboard-btn");
  console.log("Dashboard button:", dashboardBtn);
  dashboardBtn.addEventListener("click", function () {
    console.log("Dashboard button clicked!");
    chrome.tabs.create({ url: "html/dashboard.html" });
  });

  // Load current settings and update UI
  chrome.storage.sync.get(
    [
      "enabled",
      "mode",
      "postsToday",
      "premiumPlan",
      "dailyLimit",
      "aggressionDetection",
      "detectionSensitivity",
      "allowedPostsToday",
    ],
    (data) => {
      console.log("Loaded settings:", data);
      const isEnabled = data.enabled !== false;
      const currentMode = data.mode || "instant";
      const postsToday = data.postsToday || 0;
      const premiumPlan = data.premiumPlan || "free";
      const isPremium = premiumPlan !== "free";
      const dailyLimit = data.dailyLimit || 5;
      const aggressionDetection = data.aggressionDetection !== false;
      const detectionSensitivity = data.detectionSensitivity || "medium";
      const allowedPostsToday = data.allowedPostsToday || 0;

      // Update toggle
      const toggle = document.getElementById("mainToggle");
      if (isEnabled) {
        toggle.classList.add("active");
      } else {
        toggle.classList.remove("active");
      }

      // Update icon to match current state
      updateIcon(isEnabled);

      // Update detection toggle
      const detectionToggleEl = document.getElementById("detectionToggle");
      if (aggressionDetection) {
        detectionToggleEl.classList.add("active");
      } else {
        detectionToggleEl.classList.remove("active");
      }

      // Update sensitivity select and enable/disable based on tier
      const sensitivitySelectEl = document.getElementById("sensitivitySelect");
      sensitivitySelectEl.value = detectionSensitivity;

      // Enable/disable sensitivity options based on tier
      const SENSITIVITY_TIERS = {
        minimal: "full",
        low: "full",
        "medium-low": "basic",
        medium: "free",
        "medium-high": "basic",
        high: "full",
        maximum: "full",
      };
      const tierRank = { free: 0, basic: 1, full: 2 };
      const userTierRank = tierRank[premiumPlan] ?? 0;
      sensitivitySelectEl.querySelectorAll("option").forEach((option) => {
        const required = SENSITIVITY_TIERS[option.value] || "free";
        const isLocked = tierRank[required] > userTierRank;
        option.disabled = isLocked;
        if (!isLocked) {
          // Strip lock icon and tier label (e.g. "🔒 Minimale (Complet)" → "Minimale")
          option.textContent = option.textContent
            .replace(/^[🔒🔓]\s*/, "")
            .replace(/\s*\([^)]+\)\s*$/, "")
            .trim();
        }
      });

      // Update mode selection
      document.querySelectorAll(".mode-option").forEach((opt) => {
        if (opt.getAttribute("data-mode") === currentMode) {
          opt.classList.add("selected");
        } else {
          opt.classList.remove("selected");
        }
      });

      // Get actual time saved from history
      chrome.storage.local.get(["history"], (localData) => {
        const history = localData.history || [];
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayPosts = history.filter((p) => p.timestamp >= todayStart);
        const timeSavedToday = todayPosts.reduce((total, post) => {
          return total + (post.timeSaved || 3);
        }, 0);

        // Update stats
        const statsHtml = `
        <div class="stat-row">
          <span data-i18n="postsIntercepted">${chrome.i18n.getMessage("postsIntercepted")}</span>
          <span class="stat-value">${postsToday} / ${isPremium ? "∞" : dailyLimit}</span>
        </div>
        <div class="stat-row">
          <span data-i18n="regretsAvoided">${chrome.i18n.getMessage("regretsAvoided")}</span>
          <span class="stat-value">100%</span>
        </div>
        <div class="stat-row">
          <span data-i18n="timeSaved">${chrome.i18n.getMessage("timeSaved")}</span>
          <span class="stat-value">~${Math.round(timeSavedToday)} min</span>
        </div>
      `;
        document.querySelector(".stats").innerHTML =
          '<h3 data-i18n="today">' +
          chrome.i18n.getMessage("today") +
          "</h3>" +
          statsHtml;
      });

      // Show limit warning
      const limitWarning = document.getElementById("limitWarning");
      if (!isPremium && postsToday >= dailyLimit) {
        limitWarning.style.display = "block";
      }
    },
  );
});
