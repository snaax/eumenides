#!/usr/bin/env node
/**
 * Build script to inject environment variables into the extension
 * Usage: node build-config.js [environment]
 *
 * Environments:
 *   - preview (default): Uses preview API URL
 *   - production: Uses production API URL
 *   - development: Uses local API URL
 *
 * Or set API_BASE_URL environment variable directly:
 *   API_BASE_URL=https://my-api.com node build-config.js
 */

const fs = require("fs");
const path = require("path");

// Get environment from command line or default to preview
const env = process.argv[2] || "preview";

// Default URLs for each environment
const ENV_URLS = {
  preview: "https://eumenides-git-preview-snaxs-projects-47698530.vercel.app",
  production: "https://eumenides.vercel.app",
  development: "http://localhost:3000",
};

// Get API URL from environment variable or use default for environment
const apiUrl = process.env.API_BASE_URL || ENV_URLS[env] || ENV_URLS.preview;

console.log(`Building config for environment: ${env}`);
console.log(`API URL: ${apiUrl}`);

// Create config file
const configContent = `// Auto-generated config file
// Generated at: ${new Date().toISOString()}
// Environment: ${env}

window.EUMENIDES_CONFIG = {
  apiUrl: '${apiUrl}',
  environment: '${env}',
  buildTime: '${new Date().toISOString()}'
};

console.log('Eumenides Config loaded:', window.EUMENIDES_CONFIG);
`;

// Write to js/config-generated.js (for HTML pages)
const outputPath = path.join(__dirname, "js", "config-generated.js");
fs.writeFileSync(outputPath, configContent, "utf8");

console.log(`✓ Config written to: ${outputPath}`);

// Also create a service worker config (for background.js)
const swConfigContent = `// Auto-generated config for service worker
// Generated at: ${new Date().toISOString()}
// Environment: ${env}

const API_BASE_URL = '${apiUrl}';
const ENVIRONMENT = '${env}';
const BUILD_TIME = '${new Date().toISOString()}';

console.log('Eumenides Service Worker Config loaded:', { API_BASE_URL, ENVIRONMENT, BUILD_TIME });
`;

const swOutputPath = path.join(__dirname, "js", "sw-config-generated.js");
fs.writeFileSync(swOutputPath, swConfigContent, "utf8");

console.log(`✓ Service Worker config written to: ${swOutputPath}`);
console.log("✓ Build complete!");
console.log("");
console.log("Remember to:");
console.log("  1. Include config-generated.js in your HTML files");
console.log("  2. Import sw-config-generated.js at the top of background.js");
