console.log("Popup script loaded");

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
    chrome.storage.sync.get(["premium"], (data) => {
      const isPremium = data.premium || false;
      const tier = isPremium ? "premium" : "free"; // TODO: Add 'basic' tier detection

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
        chrome.storage.sync.get(["premium"], (data) => {
          if (!data.premium) {
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

  // Premium upgrade
  const upgradeBtn = document.querySelector(".upgrade-btn");
  console.log("Upgrade button:", upgradeBtn);
  upgradeBtn.addEventListener("click", function () {
    console.log("Upgrade button clicked!");
    chrome.tabs.create({ url: "html/activate-premium.html" });
  });

  // Dashboard
  const dashboardBtn = document.querySelector(".dashboard-btn");
  console.log("Dashboard button:", dashboardBtn);
  dashboardBtn.addEventListener("click", function () {
    console.log("Dashboard button clicked!");
    chrome.tabs.create({ url: "html/dashboard.html" });
  });

  // Load current settings and update UI
<<<<<<< HEAD
  chrome.storage.sync.get(['enabled', 'mode', 'postsToday', 'premium', 'premiumPlan', 'dailyLimit', 'subscriptionCanceled'], (data) => {
    console.log('Loaded settings:', data);
    const isEnabled = data.enabled !== false;
    const currentMode = data.mode || 'instant';
    const postsToday = data.postsToday || 0;
    const isPremium = data.premium || false;
    const premiumPlan = data.premiumPlan || null;
    const dailyLimit = data.dailyLimit || 5;
    const isCanceled = data.subscriptionCanceled || false;
=======
  chrome.storage.sync.get(
    [
      "enabled",
      "mode",
      "postsToday",
      "premium",
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
      const isPremium = data.premium || false;
      const dailyLimit = data.dailyLimit || 5;
      const aggressionDetection = data.aggressionDetection !== false;
      const detectionSensitivity = data.detectionSensitivity || "medium";
      const allowedPostsToday = data.allowedPostsToday || 0;
>>>>>>> main

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

      // Enable/disable options based on tier
      const tier = isPremium ? "premium" : "free"; // TODO: Add 'basic' tier detection
      const options = sensitivitySelectEl.querySelectorAll("option");
      options.forEach((option) => {
        const value = option.value;
        if (
          window.EumenidesDetector &&
          window.EumenidesDetector.isSensitivityAvailable
        ) {
          const isAvailable = window.EumenidesDetector.isSensitivityAvailable(
            value,
            tier,
          );
          option.disabled = !isAvailable;
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

<<<<<<< HEAD
    // Show limit warning
    const limitWarning = document.getElementById('limitWarning');
    if (!isPremium && postsToday >= dailyLimit) {
      limitWarning.style.display = 'block';
    }

    // Hide PREMIUM label from delay mode if user has premium
    const delayModeOption = document.querySelector('[data-mode="delay"]');
    const delayPremiumBadge = delayModeOption.querySelector('.premium-badge');
    if (isPremium && delayPremiumBadge) {
      delayPremiumBadge.style.display = 'none';
    }

    // Update upgrade button text and behavior
    const upgradeBtn = document.querySelector('.upgrade-btn');
    const dashboardBtn = document.querySelector('.dashboard-btn');

    if (!isPremium) {
      // Free plan - show upgrade button
      upgradeBtn.textContent = chrome.i18n.getMessage('upgradePremium') || '✨ Upgrade to Premium - $4.99/month';
      upgradeBtn.style.display = 'block';
      // Hide dashboard for free users
      dashboardBtn.style.display = 'none';
    } else if (premiumPlan === 'basic') {
      // Basic plan - show upgrade to full
      if (isCanceled) {
        upgradeBtn.textContent = chrome.i18n.getMessage('subscriptionCanceled') || '⚠️ Subscription Canceled';
        upgradeBtn.style.background = 'rgba(255, 107, 107, 0.3)';
        upgradeBtn.style.color = '#fff';
      } else {
        upgradeBtn.textContent = chrome.i18n.getMessage('upgradeToFull') || '⭐ Upgrade to Full Plan';
      }
      upgradeBtn.style.display = 'block';
      // Hide dashboard for basic users
      dashboardBtn.style.display = 'none';
    } else if (premiumPlan === 'full') {
      // Full plan - show manage subscription button instead of upgrade
      upgradeBtn.textContent = chrome.i18n.getMessage('manageSubscription') || '⚙️ Manage Subscription';
      upgradeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      upgradeBtn.style.color = '#fff';
      upgradeBtn.style.display = 'block';
      // Show dashboard for full users
      dashboardBtn.style.display = 'block';
    }
  });
=======
      // Show limit warning
      const limitWarning = document.getElementById("limitWarning");
      if (!isPremium && postsToday >= dailyLimit) {
        limitWarning.style.display = "block";
      }
    },
  );
>>>>>>> main
});
