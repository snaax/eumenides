// One-time script to activate premium
// Run this in the console of any page where the extension is loaded

chrome.storage.sync.set({
  premium: true,
  premiumSince: Date.now(),
  postsToday: 0  // Reset daily counter
}, () => {
  console.log('✨ Premium activated!');
  console.log('Premium features unlocked:');
  console.log('- Unlimited daily posts');
  console.log('- Delay mode enabled');
  alert('✨ Premium activated! Reload the extension popup to see changes.');
});
