// Eumenides - Background Service Worker

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

let userSettings = {
  enabled: true,
  mode: 'instant',
  premium: false,
  dailyLimit: 5,
  delayDuration: 6
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      enabled: true,
      mode: 'instant',
      premium: false,
      postsToday: 0,
      installDate: Date.now(),
      totalPostsIntercepted: 0
    });

    // Set initial icon (enabled by default)
    updateIcon(true);

    chrome.tabs.create({ url: 'html/welcome.html' });
  }

  setupDailyReset();
  setupDelayedPostChecker();
});

chrome.storage.sync.get(null, (data) => {
  userSettings = { ...userSettings, ...data };

  // Set icon based on current enabled state on startup
  const isEnabled = data.enabled !== false;
  updateIcon(isEnabled);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    if (userSettings.hasOwnProperty(key)) {
      userSettings[key] = changes[key].newValue;
    }
  }

  // Update icon when enabled state changes
  if (changes.enabled) {
    updateIcon(changes.enabled.newValue);
  }
});

function setupDailyReset() {
  chrome.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60
  });
}

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    chrome.storage.sync.set({ postsToday: 0 });
    generateDailyStats();
  }
  
  if (alarm.name.startsWith('delayedPost_')) {
    const postId = alarm.name.replace('delayedPost_', '');
    notifyDelayedPost(postId);
  }
});

function setupDelayedPostChecker() {
  chrome.alarms.create('checkDelayedPosts', {
    periodInMinutes: 60
  });
}

async function notifyDelayedPost(postId) {
  const data = await chrome.storage.local.get(['delayedPosts']);
  const posts = data.delayedPosts || [];
  const post = posts.find(p => p.timestamp.toString() === postId);
  
  if (!post) return;
  
  chrome.notifications.create(`delayedPost_${postId}`, {
    type: 'basic',
    title: chrome.i18n.getMessage('notifDelayedPostTitle'),
    message: chrome.i18n.getMessage('notifDelayedPostMessage', [getTimeAgo(post.timestamp), post.content.substring(0, 100)]),
    buttons: [
      { title: chrome.i18n.getMessage('postNow') },
      { title: chrome.i18n.getMessage('delete') }
    ],
    requireInteraction: true
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('delayedPost_')) {
    const postId = notificationId.replace('delayedPost_', '');
    
    if (buttonIndex === 0) {
      openPostEditor(postId);
    } else {
      removeDelayedPost(postId);
    }
    
    chrome.notifications.clear(notificationId);
  }
});

async function openPostEditor(postId) {
  const data = await chrome.storage.local.get(['delayedPosts']);
  const posts = data.delayedPosts || [];
  const post = posts.find(p => p.timestamp.toString() === postId);
  
  if (!post) return;
  
  const platformUrls = {
    twitter: 'https://twitter.com/compose/tweet',
    facebook: 'https://www.facebook.com',
    linkedin: 'https://www.linkedin.com/feed/',
    reddit: 'https://www.reddit.com/submit'
  };
  
  const url = platformUrls[post.platform];
  if (url) {
    chrome.tabs.create({ url }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.sendMessage(tabId, {
            action: 'fillContent',
            content: post.content
          });
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }
  
  removeDelayedPost(postId);
}

async function removeDelayedPost(postId) {
  const data = await chrome.storage.local.get(['delayedPosts']);
  const posts = data.delayedPosts || [];
  const filteredPosts = posts.filter(p => p.timestamp.toString() !== postId);
  await chrome.storage.local.set({ delayedPosts: filteredPosts });
}

function getTimeAgo(timestamp) {
  const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  if (hours < 1) return chrome.i18n.getMessage('timeAgoLessThan1h');
  if (hours === 1) return chrome.i18n.getMessage('timeAgo1h');
  if (hours < 24) return chrome.i18n.getMessage('timeAgoHours', [hours.toString()]);
  const days = Math.floor(hours / 24);
  if (days === 1) return chrome.i18n.getMessage('timeAgo1d');
  return chrome.i18n.getMessage('timeAgoDays', [days.toString()]);
}

async function generateDailyStats() {
  const data = await chrome.storage.local.get(['history']);
  const history = data.history || [];
  
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const yesterdayPosts = history.filter(p => p.timestamp > oneDayAgo);
  
  const stats = {
    postsIntercepted: yesterdayPosts.length,
    timesSaved: yesterdayPosts.reduce((total, post) => total + (post.timeSaved || 3), 0),
    mostActiveHour: getMostActiveHour(yesterdayPosts),
    dominantEmotion: getDominantEmotion(yesterdayPosts),
    date: new Date().toISOString().split('T')[0]
  };
  
  const statsData = await chrome.storage.local.get(['dailyStats']);
  const dailyStats = statsData.dailyStats || [];
  dailyStats.unshift(stats);
  
  if (dailyStats.length > 30) dailyStats.pop();
  
  await chrome.storage.local.set({ dailyStats });
}

function getMostActiveHour(posts) {
  const hourCounts = {};
  posts.forEach(post => {
    const hour = new Date(post.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  let maxHour = 0;
  let maxCount = 0;
  for (let hour in hourCounts) {
    if (hourCounts[hour] > maxCount) {
      maxCount = hourCounts[hour];
      maxHour = hour;
    }
  }
  
  return `${maxHour}h`;
}

function getDominantEmotion(posts) {
  const emotionCounts = {};
  posts.forEach(post => {
    const emotion = post.emotion || 'Neutre';
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });
  
  let maxEmotion = 'Neutre';
  let maxCount = 0;
  for (let emotion in emotionCounts) {
    if (emotionCounts[emotion] > maxCount) {
      maxCount = emotionCounts[emotion];
      maxEmotion = emotion;
    }
  }
  
  return maxEmotion;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'postIntercepted') {
    chrome.storage.sync.get(['totalPostsIntercepted'], (data) => {
      const total = (data.totalPostsIntercepted || 0) + 1;
      chrome.storage.sync.set({ totalPostsIntercepted: total });
      checkMilestone(total);
    });

    analyzeSentiment(request.content);
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'scheduleDelayedPost') {
    scheduleDelayedPost(request.post);
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'getStats') {
    getStatsForDashboard().then(stats => {
      sendResponse(stats);
    }).catch(error => {
      console.error('Error getting stats:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (request.action === 'openDashboard') {
    chrome.tabs.create({ url: 'html/dashboard.html' });
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'checkPremium') {
    sendResponse({ premium: userSettings.premium });
    return false;
  }

  return false;
});

function scheduleDelayedPost(post) {
  const alarmTime = post.notifyAt || (Date.now() + userSettings.delayDuration * 60 * 60 * 1000);
  
  chrome.alarms.create(`delayedPost_${post.timestamp}`, {
    when: alarmTime
  });
}

function analyzeSentiment(content) {
  const negativeWords = ['incompétent', 'ridicule', 'stupide', 'nul', 'débile', 'aberrant', 'pathétique'];
  const veryNegativeWords = ['haine', 'déteste', 'horrible', 'merde'];
  
  const lowerContent = content.toLowerCase();
  
  let score = 0;
  negativeWords.forEach(word => {
    if (lowerContent.includes(word)) score += 1;
  });
  veryNegativeWords.forEach(word => {
    if (lowerContent.includes(word)) score += 2;
  });
  
  if (score >= 3) {
    suggestAutoMode();
  }
}

function suggestAutoMode() {
  chrome.notifications.create('suggestAutoMode', {
    type: 'basic',
    title: chrome.i18n.getMessage('notifSuggestionTitle'),
    message: chrome.i18n.getMessage('notifSuggestionMessage'),
    buttons: [
      { title: chrome.i18n.getMessage('activate2h') },
      { title: chrome.i18n.getMessage('noThanks') }
    ]
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'suggestAutoMode' && buttonIndex === 0) {
    chrome.storage.sync.set({ forcedMode: true });
    
    setTimeout(() => {
      chrome.storage.sync.set({ forcedMode: false });
    }, 2 * 60 * 60 * 1000);
    
    chrome.notifications.clear(notificationId);
  }
});

function checkMilestone(total) {
  const milestones = [
    { count: 10, badge: 'first_steps', nameKey: 'badgeFirstSteps' },
    { count: 50, badge: 'apprentice', nameKey: 'badgeApprentice' },
    { count: 100, badge: 'centurion', nameKey: 'badgeCenturion' },
    { count: 500, badge: 'master', nameKey: 'badgeMaster' },
    { count: 1000, badge: 'legend', nameKey: 'badgeLegend' }
  ];
  
  milestones.forEach(milestone => {
    if (total === milestone.count) {
      unlockBadge(milestone);
    }
  });
}

async function unlockBadge(milestone) {
  const data = await chrome.storage.local.get(['badges']);
  const badges = data.badges || [];

  if (!badges.includes(milestone.badge)) {
    badges.push(milestone.badge);
    await chrome.storage.local.set({ badges });

    chrome.notifications.create(`badge_${milestone.badge}`, {
      type: 'basic',
      title: chrome.i18n.getMessage('notifBadgeTitle'),
      message: chrome.i18n.getMessage('notifBadgeMessage', [chrome.i18n.getMessage(milestone.nameKey)]),
      priority: 2
    });
  }
}

async function getStatsForDashboard() {
  const syncData = await chrome.storage.sync.get(null);
  const localData = await chrome.storage.local.get(['history', 'dailyStats', 'badges']);
  
  const history = localData.history || [];
  const dailyStats = localData.dailyStats || [];
  
  const streak = calculateStreak(dailyStats);
  const totalTime = history.reduce((total, post) => total + (post.timeSaved || 3), 0);
  
  return {
    totalIntercepted: syncData.totalPostsIntercepted || 0,
    postsToday: syncData.postsToday || 0,
    streak,
    totalTimeMinutes: Math.round(totalTime),
    recentPosts: history.slice(0, 10),
    badges: localData.badges || [],
    weeklyTrend: calculateWeeklyTrend(dailyStats)
  };
}

function calculateStreak(dailyStats) {
  if (!dailyStats.length) return 0;
  
  let streak = 0;
  
  for (let i = 0; i < dailyStats.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    if (dailyStats[i] && dailyStats[i].date === expectedDateStr && dailyStats[i].postsIntercepted > 0) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateWeeklyTrend(dailyStats) {
  const lastWeek = dailyStats.slice(0, 7);
  const previousWeek = dailyStats.slice(7, 14);
  
  const lastWeekTotal = lastWeek.reduce((sum, day) => sum + (day.postsIntercepted || 0), 0);
  const previousWeekTotal = previousWeek.reduce((sum, day) => sum + (day.postsIntercepted || 0), 0);
  
  if (previousWeekTotal === 0) return 0;
  
  return Math.round(((lastWeekTotal - previousWeekTotal) / previousWeekTotal) * 100);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activatePremium') {
    verifyPremiumPayment(request.userId, request.transactionId)
      .then(valid => {
        if (valid) {
          chrome.storage.sync.set({ premium: true, premiumSince: Date.now() });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Payment verification failed' });
        }
      });
    return true;
  }
});

async function verifyPremiumPayment(userId, transactionId) {
  // SECURITY WARNING: This is a placeholder implementation
  // In production, this MUST call a real backend API to verify payment
  // DO NOT ship this without proper payment verification
  console.warn('⚠️ Premium verification is mocked - implement real backend verification before production');

  // Mock implementation - REPLACE WITH REAL API CALL
  // Example:
  // const response = await fetch('https://your-backend.com/api/verify-payment', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ userId, transactionId })
  // });
  // return response.ok && (await response.json()).verified;

  return false; // Changed to false by default for security
}

console.log('Eumenides Background Service Worker initialized');