console.log('Popup script loaded');

// Update extension icon based on enabled state
function updateIcon(enabled) {
  console.log('updateIcon called with enabled:', enabled);
  const iconPath = enabled ? {
    "16": "/icons/icon16.png",
    "48": "/icons/icon48.png",
    "128": "/icons/icon128.png"
  } : {
    "16": "/icons/icon16-disabled.png",
    "48": "/icons/icon48-disabled.png",
    "128": "/icons/icon128-disabled.png"
  };

  console.log('Setting icon path:', iconPath);
  chrome.action.setIcon({ path: iconPath }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting icon:', chrome.runtime.lastError.message);
    } else {
      console.log('Icon updated successfully to', enabled ? 'enabled' : 'disabled');
    }
  });
}

// Apply i18n translations
function applyTranslations() {
  // Set document title
  document.title = chrome.i18n.getMessage('extName') || 'Eumenides';

  // Translate all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}

function selectMode(mode, element) {
  console.log('Selecting mode:', mode);
  document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('selected'));
  element.classList.add('selected');
  chrome.storage.sync.set({ mode }, () => {
    console.log('Mode saved:', mode);
  });

  // Notify content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'changeMode',
          mode
        }).catch(() => {
          // Tab may not have content script, ignore error
        });
      }
    });
  });
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up event listeners');

  // Apply translations first
  applyTranslations();

  // Toggle enable/disable
  const mainToggle = document.getElementById('mainToggle');
  console.log('Main toggle element:', mainToggle);

  mainToggle.addEventListener('click', function() {
    console.log('Toggle clicked!');
    this.classList.toggle('active');
    const enabled = this.classList.contains('active');
    console.log('Setting enabled to:', enabled);
    chrome.storage.sync.set({ enabled }, () => {
      console.log('Enabled saved:', enabled);
    });

    // Update icon based on enabled state
    updateIcon(enabled);

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleEnabled',
            enabled
          }).catch(() => {
            // Tab may not have content script, ignore error
          });
        }
      });
    });
  });

  // Mode selection
  document.querySelectorAll('.mode-option').forEach(option => {
    console.log('Adding listener to mode option:', option.getAttribute('data-mode'));
    option.addEventListener('click', function() {
      console.log('Mode option clicked!');
      const mode = this.getAttribute('data-mode');

      // Check premium for delay mode
      if (mode === 'delay') {
        chrome.storage.sync.get(['premium'], (data) => {
          if (!data.premium) {
            alert(chrome.i18n.getMessage('delayModeRequiresPremium'));
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
  const upgradeBtn = document.querySelector('.upgrade-btn');
  console.log('Upgrade button:', upgradeBtn);
  upgradeBtn.addEventListener('click', function() {
    console.log('Upgrade button clicked!');
    chrome.tabs.create({ url: 'html/activate-premium.html' });
  });

  // Dashboard
  const dashboardBtn = document.querySelector('.dashboard-btn');
  console.log('Dashboard button:', dashboardBtn);
  dashboardBtn.addEventListener('click', function() {
    console.log('Dashboard button clicked!');
    chrome.tabs.create({ url: 'html/dashboard.html' });
  });

  // Load current settings and update UI
  chrome.storage.sync.get(['enabled', 'mode', 'postsToday', 'premium', 'dailyLimit'], (data) => {
    console.log('Loaded settings:', data);
    const isEnabled = data.enabled !== false;
    const currentMode = data.mode || 'instant';
    const postsToday = data.postsToday || 0;
    const isPremium = data.premium || false;
    const dailyLimit = data.dailyLimit || 5;

    // Update toggle
    const toggle = document.getElementById('mainToggle');
    if (isEnabled) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }

    // Update icon to match current state
    updateIcon(isEnabled);

    // Update mode selection
    document.querySelectorAll('.mode-option').forEach(opt => {
      if (opt.getAttribute('data-mode') === currentMode) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });

    // Get actual time saved from history
    chrome.storage.local.get(['history'], (localData) => {
      const history = localData.history || [];
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayPosts = history.filter(p => p.timestamp >= todayStart);
      const timeSavedToday = todayPosts.reduce((total, post) => {
        return total + (post.timeSaved || 3);
      }, 0);

      // Update stats
      const statsHtml = `
        <div class="stat-row">
          <span data-i18n="postsIntercepted">${chrome.i18n.getMessage('postsIntercepted')}</span>
          <span class="stat-value">${postsToday} / ${isPremium ? '∞' : dailyLimit}</span>
        </div>
        <div class="stat-row">
          <span data-i18n="regretsAvoided">${chrome.i18n.getMessage('regretsAvoided')}</span>
          <span class="stat-value">100%</span>
        </div>
        <div class="stat-row">
          <span data-i18n="timeSaved">${chrome.i18n.getMessage('timeSaved')}</span>
          <span class="stat-value">~${Math.round(timeSavedToday)} min</span>
        </div>
      `;
      document.querySelector('.stats').innerHTML = '<h3 data-i18n="today">' + chrome.i18n.getMessage('today') + '</h3>' + statsHtml;
    });

    // Show limit warning
    const limitWarning = document.getElementById('limitWarning');
    if (!isPremium && postsToday >= dailyLimit) {
      limitWarning.style.display = 'block';
    }
  });
});
