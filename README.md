# Eumenides - Social Media Post Interceptor

A browser extension that prevents you from posting angry or impulsive content on social media platforms by intercepting the "Post" button.

## Features

- **Three Protection Modes:**
  - **Catharsis instantanée**: Fakes posting - shows success but doesn't publish
  - **Aperçu privé**: Shows a preview overlay before deciding
  - **Délai de réflexion** (Premium): Saves posts and asks again after 6 hours

- **Supported Platforms:**
  - Twitter/X
  - Facebook
  - LinkedIn
  - Reddit

- **Analytics Dashboard:**
  - Track intercepted posts
  - View emotional patterns
  - Earn badges and achievements
  - Monitor streaks

## Installation

### For Development (Chrome/Edge)

1. Clone or download this repository
2. **IMPORTANT**: Generate configuration file:
   ```bash
   npm run build:config preview
   # Or for local development:
   npm run build:config development
   ```
3. Open Chrome/Edge and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the `eumenides` directory

**⚠️ Configuration is mandatory! The extension will not work without running `npm run build:config` first.**

### For Production

This extension is not yet published to the Chrome Web Store. You can use the development installation method above.

## 2026 Updates & Fixes

This version includes important fixes for 2026:

- ✅ Fixed manifest.json content script reference
- ✅ Updated social media button selectors for current platform versions
- ✅ Improved content extraction with fallback selectors
- ✅ Added proper async message handling
- ✅ Removed deprecated iconUrl from notifications (Manifest V3 requirement)
- ✅ Enhanced error handling in background service worker
- ✅ Fully functional popup with real-time stats
- ✅ **Full internationalization (i18n) support** - automatically adapts to browser language
- ⚠️ Added security warnings for premium payment verification

## Internationalization (i18n)

The extension now supports multiple languages and automatically adapts to your browser's language settings.

**Supported Languages:**
- English (en) - Default
- French (fr)

**How it works:**
- The extension automatically detects your browser's language
- If your language is supported, the UI will display in that language
- Otherwise, it defaults to English

**Adding a new language:**

1. Create a new folder in `_locales/` with your language code (e.g., `_locales/es/` for Spanish)
2. Copy `_locales/en/messages.json` to your new folder
3. Translate all the `message` values (keep the keys unchanged)
4. Reload the extension

Example structure:
```
_locales/
├── en/
│   └── messages.json
├── fr/
│   └── messages.json
└── es/              # Your new language
    └── messages.json
```

## Security Notes

**IMPORTANT**: The premium verification function is currently a placeholder that returns `false` by default. Before deploying this extension for real use:

1. Implement a real backend API for payment verification
2. Replace the `verifyPremiumPayment()` function in `background.js`
3. Use proper authentication and authorization

## Known Issues

- Icon files are not included - the extension will work but won't show custom icons
- Premium payment system is not implemented
- Social media selectors may need updates as platforms change their HTML structure

## Development

### File Structure

```
eumenides/
├── manifest.json          # Extension configuration
├── README.md              # This file
├── css/
│   └── content.css        # Styles for injected UI elements
├── html/
│   ├── popup.html         # Extension popup UI
│   ├── dashboard.html     # Analytics dashboard
│   ├── premium_page.html  # Premium upgrade page
│   └── welcome.html       # First-time installation welcome page
├── js/
│   ├── background.js      # Service worker for background tasks
│   ├── content.js         # Content script injected into social media pages
│   ├── popup.js           # Popup interaction logic
│   ├── welcome.js         # Welcome page logic
│   └── premium.js         # Premium page logic
└── _locales/
    ├── en/
    │   └── messages.json  # English translations
    └── fr/
        └── messages.json  # French translations
```

### Testing

1. Install the extension in development mode
2. Navigate to a supported social media platform
3. Try to create a post
4. The extension should intercept the "Post" button

### Debugging

- Open the extension popup and check browser console for errors
- For content script debugging: Open DevTools on the social media page
- For background script debugging: Go to `chrome://extensions/` → Click "Service worker" under Eumenides

## Permissions

- `storage`: Save user settings and intercepted posts
- `notifications`: Show alerts and reminders
- `alarms`: Schedule delayed post notifications
- `host_permissions`: Access social media platforms to intercept posts

## License

This is a prototype/demonstration project. Use at your own discretion.

## Contributing

This project was created as a demonstration. If you want to improve it:

1. Fork the repository
2. Make your changes
3. Test thoroughly on all supported platforms
4. Submit a pull request

## Disclaimer

This extension is provided as-is for educational and personal use. It intercepts browser actions on third-party websites. Use responsibly and in accordance with the terms of service of the platforms you use.
