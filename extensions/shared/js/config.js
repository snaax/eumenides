// Configuration file - reads from environment variables at build time
// This file will be processed by a build script to inject environment variables

const CONFIG = {
  // API Base URL - defaults to preview environment
  API_BASE_URL: typeof process !== 'undefined' && process.env.API_BASE_URL
    ? process.env.API_BASE_URL
    : 'https://eumenides-git-preview-snaxs-projects-47698530.vercel.app',

  // For runtime in extension (since we can't use process.env in browser)
  get apiUrl() {
    // Try to read from localStorage first (set by build script)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('EUMENIDES_API_URL');
      if (stored) return stored;
    }

    // Fall back to default
    return this.API_BASE_URL;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
