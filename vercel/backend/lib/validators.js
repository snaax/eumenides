/**
 * Input validators
 * Works on both Vercel and Railway
 */

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

function validatePremiumKey(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'Premium key is required' };
  }

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(key)) {
    return { valid: false, error: 'Invalid premium key format' };
  }

  return { valid: true };
}

function validateExtensionId(extensionId) {
  if (!extensionId || typeof extensionId !== 'string') {
    return { valid: false, error: 'Extension ID is required' };
  }

  return { valid: true };
}

module.exports = {
  validateEmail,
  validatePremiumKey,
  validateExtensionId
};
