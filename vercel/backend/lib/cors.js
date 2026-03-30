/**
 * CORS helper for Vercel serverless functions
 *
 * Allows requests from:
 * - Chrome/Firefox extensions (chrome-extension://, moz-extension://)
 * - Configured ALLOWED_ORIGINS env var
 * - Falls back to * wildcard
 */
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";

  let allowedOrigin;
  if (
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://")
  ) {
    // Always allow browser extensions
    allowedOrigin = origin;
  } else if (process.env.ALLOWED_ORIGINS) {
    allowedOrigin = process.env.ALLOWED_ORIGINS;
  } else {
    allowedOrigin = "*";
  }

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Handle OPTIONS preflight and set CORS headers.
 * Returns true if the request was a preflight (caller should return early).
 */
function handleCors(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { setCorsHeaders, handleCors };
