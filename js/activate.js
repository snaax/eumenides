// Activate premium - auto from URL params or check existing premium
const API_BASE_URL = window.EUMENIDES_CONFIG?.apiUrl || 'https://eumenides-git-preview-snaxs-projects-47698530.vercel.app';

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const key = urlParams.get('key');
  const plan = urlParams.get('plan');
  const email = urlParams.get('email');
  const expires = urlParams.get('expires');
  const canceled = urlParams.get('canceled') === 'true';

  const spinner = document.getElementById('spinner');
  const statusText = document.getElementById('statusText');

  if (key && plan && email) {
    // Auto-activate from URL parameters (from checkout redirect)
    console.log('Auto-activating from URL parameters');

    try {
      await chrome.storage.sync.set({
        premium: true,
        premiumKey: key,
        premiumPlan: plan,
        premiumEmail: email,
        premiumUntil: expires,
        subscriptionCanceled: canceled,
        dailyLimit: plan === 'full' ? 999999 : (plan === 'basic' ? 15 : 5)
      });

      spinner.style.display = 'none';
      statusText.textContent = `✅ Success! Your ${plan === 'full' ? 'Full' : 'Basic'} plan has been activated!`;
      showMessage('Redirecting to premium page...', 'success');

      // Redirect to premium page after 2 seconds
      setTimeout(() => {
        window.location.href = '/html/premium_page.html';
      }, 2000);
    } catch (error) {
      console.error('Error activating:', error);
      spinner.style.display = 'none';
      statusText.textContent = 'Activation failed';
      showMessage('Failed to activate. Please try again from the premium page.', 'error');
    }
  } else {
    // No URL params - check if user already has premium in storage
    const storage = await chrome.storage.sync.get(['premium', 'premiumKey', 'premiumPlan']);

    if (storage.premium && storage.premiumKey) {
      // User already activated
      spinner.style.display = 'none';
      statusText.textContent = `Already activated: ${storage.premiumPlan === 'full' ? 'Full' : 'Basic'} Plan`;
      showMessage('Your premium is already active. Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = '/html/premium_page.html';
      }, 2000);
    } else {
      // User doesn't have URL params and no premium - redirect to premium page
      spinner.style.display = 'none';
      statusText.textContent = 'No activation data found';
      showMessage('Please complete checkout from the premium page to activate.', 'error');

      setTimeout(() => {
        window.location.href = '/html/premium_page.html';
      }, 3000);
    }
  }
});

function showMessage(text, type) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.className = `message ${type}`;
  message.style.display = 'block';
}
