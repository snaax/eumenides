document.addEventListener('DOMContentLoaded', function() {
  // Apply i18n translations
  applyTranslations();

  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    ctaButton.addEventListener('click', function() {
      chrome.storage.sync.set({ welcomeShown: true });
      window.close();
    });
  }

  function applyTranslations() {
    // Set document title
    document.title = chrome.i18n.getMessage('welcomeTitle') || 'Welcome to Eumenides';

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }
});
