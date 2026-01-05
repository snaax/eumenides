document.addEventListener('DOMContentLoaded', function() {
  // Apply i18n translations
  applyTranslations();

  const button = document.getElementById('activateBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');

  function applyTranslations() {
    // Set document title
    document.title = chrome.i18n.getMessage('activatePremiumTitle') || 'Activate Premium - Eumenides';

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }

  button.addEventListener('click', function() {
    button.disabled = true;
    statusText.textContent = 'Activating premium...';

    chrome.storage.sync.set({
      premium: true,
      premiumSince: Date.now(),
      postsToday: 0,
      dailyLimit: 999999
    }, () => {
      status.classList.add('success');
      statusText.textContent = chrome.i18n.getMessage('premiumActivated');
      button.textContent = '✓ Premium Active';

      console.log('Premium activated successfully!');
    });
  });
});
