document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // Apply i18n translations
  applyTranslations();

  // Load data from chrome.storage
  loadDashboardData();

  function applyTranslations() {
    // Set document title
    document.title = chrome.i18n.getMessage('dashboardTitle') || 'Eumenides Dashboard';

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }

  function loadDashboardData() {
    chrome.storage.local.get(['history'], (data) => {
      const history = data.history || [];
      renderStats(history);
      renderEmotionalActivityChart(history);
      renderRecentPosts(history);
      renderInsights(history);
      renderBadges(history);
      renderWordCloud(history);
    });
  }

  function renderStats(history) {
    // Calculate stats from history
    const totalIntercepted = history.length;
    const thisWeek = getThisWeekPosts(history);
    const lastWeek = getLastWeekPosts(history);

    // Update total intercepted
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues[0]) {
      statValues[0].textContent = totalIntercepted;
    }

    // Calculate time saved from actual post data
    const timeSavedMinutes = history.reduce((total, post) => {
      return total + (post.timeSaved || 3); // Default to 3 min for old posts without timeSaved
    }, 0);
    const timeSavedHours = (timeSavedMinutes / 60).toFixed(1);
    if (statValues[1]) {
      statValues[1].textContent = timeSavedHours + 'h';
    }

    // Calculate regrets avoided percentage
    const regretsAvoided = totalIntercepted > 0 ? Math.round((totalIntercepted / (totalIntercepted + 2)) * 100) : 0;
    if (statValues[2]) {
      statValues[2].textContent = regretsAvoided + '%';
    }

    // Calculate streak (days without posting)
    const streak = calculateStreak(history);
    if (statValues[3]) {
      statValues[3].textContent = streak;
    }

    // Update percentage change
    const percentChange = lastWeek.length > 0
      ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)
      : 0;

    const statChanges = document.querySelectorAll('.stat-change');
    if (statChanges[0]) {
      statChanges[0].textContent = `${percentChange >= 0 ? '↑' : '↓'} ${Math.abs(percentChange)}% ${chrome.i18n.getMessage('vsLastWeek')}`;
    }
  }

  function renderEmotionalActivityChart(history) {
    const canvas = document.getElementById('emotionalActivityChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Fix blurriness on high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (history.length === 0) {
      // Show empty state
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No posts yet - start using Eumenides to see your emotional patterns', width / 2, height / 2);
      return;
    }

    // Group posts by day for the last 7 days
    const now = Date.now();
    const days = 7;
    const dayMs = 24 * 60 * 60 * 1000;

    // Store bar positions for click detection
    const barClickAreas = [];

    const emotionColors = {
      'anger': '#ff6b6b',
      'frustration': '#ffa500',
      'irritation': '#ffcc00',
      'neutral': '#4ade80'
    };

    // Initialize data structure for 7 days
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i * dayMs);
      const date = new Date(dayStart);
      chartData.push({
        date: date,
        label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }),
        anger: 0,
        frustration: 0,
        irritation: 0,
        neutral: 0,
        total: 0,
        posts: [] // Store actual posts for filtering
      });
    }

    // Count posts by emotion for each day
    history.forEach(post => {
      const postDate = new Date(post.timestamp);
      const dayIndex = days - 1 - Math.floor((now - post.timestamp) / dayMs);

      if (dayIndex >= 0 && dayIndex < days) {
        const emotion = post.emotion || 'neutral';
        if (chartData[dayIndex]) {
          chartData[dayIndex][emotion]++;
          chartData[dayIndex].total++;
          chartData[dayIndex].posts.push(post);
        }
      }
    });

    // Chart dimensions
    const padding = 50;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    const barWidth = chartWidth / days;
    const maxTotal = Math.max(...chartData.map(d => d.total), 1);

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.setLineDash([5, 5]);
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Y-axis labels
      const value = Math.round(maxTotal - (maxTotal / 5) * i);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }
    ctx.setLineDash([]);

    // Draw stacked bars
    chartData.forEach((day, index) => {
      const x = padding + (index * barWidth) + (barWidth * 0.1);
      const barActualWidth = barWidth * 0.8;

      let currentY = height - padding;

      // Store click area for this bar
      barClickAreas.push({
        x: x,
        y: padding,
        width: barActualWidth,
        height: chartHeight,
        day: day
      });

      // Stack emotions from bottom to top
      ['neutral', 'irritation', 'frustration', 'anger'].forEach(emotion => {
        const count = day[emotion];
        if (count > 0) {
          const barHeight = (count / maxTotal) * chartHeight;

          ctx.fillStyle = emotionColors[emotion];
          ctx.fillRect(x, currentY - barHeight, barActualWidth, barHeight);

          currentY -= barHeight;
        }
      });

      // X-axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day.label, x + barActualWidth / 2, height - padding + 20);
    });

    // Draw legend
    const legendX = width - padding - 150;
    const legendY = padding;
    const legendItems = [
      { label: 'Anger', color: emotionColors.anger },
      { label: 'Frustration', color: emotionColors.frustration },
      { label: 'Irritation', color: emotionColors.irritation },
      { label: 'Neutral', color: emotionColors.neutral }
    ];

    legendItems.forEach((item, index) => {
      const y = legendY + (index * 25);

      // Color box
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, y, 15, 15);

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 20, y + 12);
    });

    // Add click handler to canvas
    canvas.style.cursor = 'pointer';

    // Remove previous listener if exists
    if (canvas._clickHandler) {
      canvas.removeEventListener('click', canvas._clickHandler);
    }

    // Create and store new click handler
    canvas._clickHandler = (event) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Check which bar was clicked
      for (const area of barClickAreas) {
        if (clickX >= area.x &&
            clickX <= area.x + area.width &&
            clickY >= area.y &&
            clickY <= area.y + area.height) {

          // Filter posts for this day
          if (area.day.posts.length > 0) {
            const dateLabel = area.day.label === 'Today'
              ? 'Today'
              : area.day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

            renderRecentPosts(area.day.posts, dateLabel);

            // Scroll to posts section
            const postsSection = document.querySelector('.posts-section');
            if (postsSection) {
              postsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
          break;
        }
      }
    };

    canvas.addEventListener('click', canvas._clickHandler);
  }

  function renderRecentPosts(history, filterLabel) {
    const postsSection = document.querySelector('.posts-section');
    if (!postsSection) return;

    // Remove existing posts and filter indicator
    const existingPosts = postsSection.querySelectorAll('.post-item');
    existingPosts.forEach(post => post.remove());
    const existingFilter = postsSection.querySelector('.filter-indicator');
    if (existingFilter) existingFilter.remove();

    // Add header if not present
    let header = postsSection.querySelector('h2');
    if (!header) {
      header = document.createElement('h2');
      header.textContent = chrome.i18n.getMessage('recentPostsTitle');
      postsSection.insertBefore(header, postsSection.firstChild);
    }

    // Add filter indicator if filtering by day
    if (filterLabel) {
      const filterDiv = document.createElement('div');
      filterDiv.className = 'filter-indicator';
      filterDiv.innerHTML = `
        <span>Showing posts from: <strong>${filterLabel}</strong></span>
        <button class="clear-filter-btn">✕ Show all posts</button>
      `;
      postsSection.insertBefore(filterDiv, header.nextSibling);

      // Add click handler to clear filter button
      const clearBtn = filterDiv.querySelector('.clear-filter-btn');
      clearBtn.addEventListener('click', () => {
        chrome.storage.local.get(['history'], (data) => {
          const history = data.history || [];
          renderRecentPosts(history);
        });
      });
    }

    // Render recent posts
    const recentPosts = history.slice(0, 10);

    if (recentPosts.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'post-item';
      emptyMessage.innerHTML = `
        <div class="post-content" style="text-align: center; opacity: 0.5;">
          ${chrome.i18n.getMessage('noPostsYet')}
        </div>
      `;
      postsSection.appendChild(emptyMessage);
      return;
    }

    recentPosts.forEach(post => {
      const timeAgo = getTimeAgo(post.timestamp);
      const platform = getPlatformName(post.platform);
      const emotion = getEmotionLabel(post.emotion);

      const postElement = document.createElement('div');
      postElement.className = 'post-item';
      postElement.innerHTML = `
        <div class="post-header">
          <span class="post-platform">${platform}</span>
          <span class="post-time">${timeAgo}</span>
        </div>
        <div class="post-content">
          "${escapeHtml(post.content)}"
        </div>
        <span class="post-emotion">${emotion}</span>
      `;
      postsSection.appendChild(postElement);
    });
  }

  function renderInsights(history) {
    if (history.length === 0) return;

    // Analyze patterns
    const hourlyDistribution = analyzeHourlyPatterns(history);
    const peakHour = Object.entries(hourlyDistribution)
      .sort((a, b) => b[1] - a[1])[0];

    const insights = document.querySelectorAll('.insight-card p');

    // Pattern insight
    if (peakHour && insights[0]) {
      const hour = parseInt(peakHour[0]);
      const count = peakHour[1];
      const avgCount = history.length / 24;
      const multiplier = (count / avgCount).toFixed(1);

      insights[0].textContent = chrome.i18n.getMessage('insightPattern', [multiplier, hour]);
    }

    // Progression insight
    if (insights[1]) {
      const recentPosts = history.slice(0, Math.floor(history.length / 2));
      const olderPosts = history.slice(Math.floor(history.length / 2));

      const recentIntensity = calculateEmotionalIntensity(recentPosts);
      const olderIntensity = calculateEmotionalIntensity(olderPosts);

      const improvement = olderIntensity > 0
        ? Math.round(((olderIntensity - recentIntensity) / olderIntensity) * 100)
        : 0;

      if (improvement > 0) {
        insights[1].textContent = chrome.i18n.getMessage('insightVocabulary', [improvement]);
      }
    }

    // Streak insight
    if (insights[2]) {
      const streak = calculateStreak(history);
      insights[2].textContent = chrome.i18n.getMessage('insightStreak', [streak]);
    }
  }

  function renderBadges(history) {
    const badges = [];
    const totalPosts = history.length;

    // Centurion badge
    if (totalPosts >= 100) {
      badges.push({
        icon: '🛡️',
        name: chrome.i18n.getMessage('badgeCenturion'),
        desc: chrome.i18n.getMessage('badgeCenturionDesc')
      });
    }

    // Stoic badge
    if (totalPosts >= 30) {
      badges.push({
        icon: '🧘',
        name: chrome.i18n.getMessage('badgeStoic'),
        desc: chrome.i18n.getMessage('badgeStoicDesc')
      });
    }

    // Time saver badge
    const timeSavedMinutes = history.reduce((total, post) => total + (post.timeSaved || 3), 0);
    const timeSavedHours = timeSavedMinutes / 60;
    if (timeSavedHours >= 50) {
      badges.push({
        icon: '⏰',
        name: chrome.i18n.getMessage('badgeTimeMaster'),
        desc: chrome.i18n.getMessage('badgeTimeMasterDesc', [Math.round(timeSavedHours)])
      });
    }

    // Night guardian badge
    const nightPosts = history.filter(p => {
      const hour = new Date(p.timestamp).getHours();
      return hour >= 22 || hour < 6;
    });
    if (nightPosts.length >= 20) {
      badges.push({
        icon: '🌙',
        name: chrome.i18n.getMessage('badgeNightGuardian'),
        desc: chrome.i18n.getMessage('badgeNightGuardianDesc', [nightPosts.length])
      });
    }

    // Render badges
    const badgeSection = document.querySelector('.badge-section');
    if (!badgeSection) return;

    badgeSection.innerHTML = '';

    if (badges.length === 0) {
      const emptyBadge = document.createElement('div');
      emptyBadge.style.cssText = 'opacity: 0.5; padding: 20px;';
      emptyBadge.textContent = chrome.i18n.getMessage('noBadgesYet');
      badgeSection.appendChild(emptyBadge);
      return;
    }

    badges.forEach(badge => {
      const badgeElement = document.createElement('div');
      badgeElement.className = 'badge';
      badgeElement.innerHTML = `
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-info">
          <h4>${badge.name}</h4>
          <p>${badge.desc}</p>
        </div>
      `;
      badgeSection.appendChild(badgeElement);
    });
  }

  function renderWordCloud(history) {
    if (history.length === 0) return;

    const wordCounts = {};
    const angerWords = [
      // French anger words (50)
      'incompétent', 'ridicule', 'stupide', 'aberrant', 'nul', 'débile',
      'connard', 'connasse', 'idiot', 'idiote', 'imbécile', 'crétin',
      'minable', 'pathétique', 'merde', 'putain', 'bordel', 'con',
      'conne', 'pourri', 'foutu', 'dégueulasse', 'dégoûtant', 'horrible',
      'insupportable', 'inacceptable', 'scandaleux', 'honteux', 'lamentable', 'pitoyable',
      'catastrophique', 'désastreux', 'déplorable', 'méprisable', 'odieux', 'exécrable',
      'médiocre', 'navrant', 'affligeant', 'consternant', 'révoltant', 'choquant',
      'frustrant', 'énervant', 'agaçant', 'irritant', 'pénible', 'insensé',
      'absurde', 'grotesque', 'risible', 'salaud', 'salope', 'emmerdant',
      'chiant', 'chiante', 'démentiel', 'délirant', 'aberration', 'nullité',
      'incompréhensible', 'injuste', 'injustifiable', 'indéfendable', 'hors-de-question',
      'intolérable', 'inadmissible', 'ignoble', 'infâme', 'répugnant',
      'abject', 'vil', 'sordide', 'immonde', 'infecte',
      'hideux', 'monstrueux', 'dingue', 'taré', 'malade',

      // English anger words (50+)
      'incompetent', 'ridiculous', 'stupid', 'absurd', 'pathetic', 'idiot',
      'moron', 'dumb', 'idiotic', 'moronic', 'foolish', 'ignorant',
      'terrible', 'awful', 'horrible', 'disgusting', 'shit', 'damn',
      'fuck', 'fucking', 'crap', 'bullshit', 'trash', 'garbage',
      'worthless', 'useless', 'pointless', 'hopeless', 'lousy', 'lame',
      'appalling', 'atrocious', 'dreadful', 'abysmal', 'deplorable', 'shameful',
      'disgraceful', 'outrageous', 'scandalous', 'unacceptable', 'insufferable', 'intolerable',
      'annoying', 'irritating', 'frustrating', 'infuriating', 'maddening', 'aggravating',
      'offensive', 'insulting', 'contemptible', 'despicable', 'vile', 'wretched',
      'miserable', 'pathetic', 'pitiful', 'laughable', 'ludicrous', 'preposterous',
      'asinine', 'inane', 'senseless', 'mindless', 'brainless', 'thoughtless',
      'reckless', 'careless', 'negligent', 'incomprehensible', 'unjust', 'unfair',
      'unbelievable', 'incredible', 'insane', 'crazy', 'nuts', 'mad',
      'obnoxious', 'repulsive', 'revolting', 'sickening', 'nauseating', 'vomit',
      'bastard', 'asshole', 'jerk', 'prick', 'dick', 'douchebag',
      'scumbag', 'lowlife', 'loser', 'failure', 'joke', 'clown'
    ];

    history.forEach(post => {
      const words = post.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        // Clean word
        word = word.replace(/[.,!?;:]/g, '');
        if (angerWords.includes(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => `"${word}" (${count}x)`)
      .join(', ');

    const wordCloudPlaceholder = document.querySelectorAll('.chart-placeholder')[1];
    if (wordCloudPlaceholder) {
      if (topWords) {
        const prefix = chrome.i18n.getMessage('wordCloudPrefix') || 'Most used words:';
        wordCloudPlaceholder.textContent = `${prefix} ${topWords}`;
      } else {
        wordCloudPlaceholder.textContent = chrome.i18n.getMessage('noWordsDetected');
      }
    }
  }

  // Helper functions
  function getThisWeekPosts(history) {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return history.filter(post => post.timestamp >= weekAgo);
  }

  function getLastWeekPosts(history) {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    return history.filter(post => post.timestamp >= twoWeeksAgo && post.timestamp < weekAgo);
  }

  function calculateStreak(history) {
    if (history.length === 0) return 0;

    // Calculate days since last intercepted post
    const now = Date.now();
    const lastPost = history[0];
    const daysSince = Math.floor((now - lastPost.timestamp) / (24 * 60 * 60 * 1000));

    return Math.max(daysSince, 1);
  }

  function calculateEmotionalIntensity(posts) {
    const angerWords = ['incompétent', 'ridicule', 'stupide', 'aberrant', 'nul', 'débile'];
    let total = 0;

    posts.forEach(post => {
      const content = post.content.toLowerCase();
      angerWords.forEach(word => {
        const count = (content.match(new RegExp(word, 'g')) || []).length;
        total += count;
      });
    });

    return posts.length > 0 ? total / posts.length : 0;
  }

  function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return chrome.i18n.getMessage('justNow');
    if (minutes < 60) return chrome.i18n.getMessage('minutesAgo', [minutes]);
    if (hours < 24) return chrome.i18n.getMessage('hoursAgo', [hours]);
    if (days === 1) return chrome.i18n.getMessage('yesterday');
    return chrome.i18n.getMessage('daysAgo', [days]);
  }

  function getPlatformName(platform) {
    const names = {
      'twitter': 'Twitter/X',
      'reddit': 'Reddit',
      'facebook': 'Facebook',
      'linkedin': 'LinkedIn'
    };
    return names[platform] || platform;
  }

  function getEmotionLabel(emotion) {
    const labels = {
      'anger': chrome.i18n.getMessage('emotionAnger'),
      'frustration': chrome.i18n.getMessage('emotionFrustration'),
      'irritation': chrome.i18n.getMessage('emotionIrritation'),
      'neutral': chrome.i18n.getMessage('emotionNeutral')
    };
    return labels[emotion] || chrome.i18n.getMessage('emotionUnclassified');
  }

  function analyzeHourlyPatterns(history) {
    const hourly = {};
    history.forEach(post => {
      const hour = new Date(post.timestamp).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    return hourly;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Period selector functionality
  const periodButtons = document.querySelectorAll('.period-btn');
  periodButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      periodButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Filter history based on selected period
      const period = this.textContent.toLowerCase();
      chrome.storage.local.get(['history'], (data) => {
        const history = data.history || [];
        const filtered = filterByPeriod(history, period);
        renderStats(filtered);
        renderEmotionalActivityChart(filtered);
        renderRecentPosts(filtered);
        renderInsights(filtered);
        renderWordCloud(filtered);
      });
    });
  });

  function filterByPeriod(history, period) {
    const now = Date.now();
    switch(period) {
      case 'aujourd\'hui':
        const today = new Date().setHours(0, 0, 0, 0);
        return history.filter(p => p.timestamp >= today);
      case 'cette semaine':
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        return history.filter(p => p.timestamp >= weekAgo);
      case 'ce mois':
        const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
        return history.filter(p => p.timestamp >= monthAgo);
      default:
        return history;
    }
  }
});
