document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const API_BASE_URL = window.EUMENIDES_CONFIG?.apiUrl;
  let currentPeriodDays = 7; // Default to week

  // Apply i18n translations
  applyTranslations();

  // Set up period selectors
  setupPeriodSelectors();

  // Load dashboard data
  loadDashboardData();

  function applyTranslations() {
    document.title =
      chrome.i18n.getMessage("dashboardTitle") || "Eumenides Dashboard";

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }

  function setupPeriodSelectors() {
    const periodBtns = document.querySelectorAll(".period-btn");
    periodBtns.forEach((btn, index) => {
      btn.addEventListener("click", () => {
        // Remove active from all
        periodBtns.forEach((b) => b.classList.remove("active"));
        // Add active to clicked
        btn.classList.add("active");

        // Set period
        switch (index) {
          case 0:
            currentPeriodDays = 1;
            break; // Today
          case 1:
            currentPeriodDays = 7;
            break; // Week
          case 2:
            currentPeriodDays = 30;
            break; // Month
          case 3:
            currentPeriodDays = 365;
            break; // All
        }

        // Reload data
        loadDashboardData();
      });
    });
  }

  async function loadDashboardData() {
    try {
      // Get user email
      const syncData = await chrome.storage.sync.get([
        "premiumEmail",
        "premium",
      ]);

      if (!syncData.premium || !syncData.premiumEmail) {
        console.log("Not premium or no email, showing local data fallback");
        loadLocalData();
        return;
      }

      // Fetch stats from API
      const response = await fetch(`${API_BASE_URL}/api/get-stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: syncData.premiumEmail,
          days: currentPeriodDays,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("API response:", data);

      if (data.success) {
        renderAllStats(data);
      } else {
        console.error("API returned error:", data);
        loadLocalData();
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
      loadLocalData();
    }
  }

  function renderAllStats(data) {
    console.log("renderAllStats called with data:", data);

    const { analytics, insights, daily } = data;

    if (!analytics) {
      console.error("No analytics data received");
      return;
    }

    // Update stat cards
    document.getElementById("postsIntercepted").textContent =
      analytics.postsIntercepted || 0;
    document.getElementById("timeSaved").textContent =
      `${analytics.timeSavedHours || 0}h`;
    document.getElementById("regretsAvoided").textContent =
      `${analytics.regretsAvoided || 0}%`;
    document.getElementById("currentStreak").textContent =
      analytics.currentStreak || 0;

    // Weekly trend
    const weeklyTrend = analytics.weeklyTrend || 0;
    const trendElement = document.getElementById("weeklyTrendChange");
    if (weeklyTrend > 0) {
      trendElement.innerHTML = `↑ ${weeklyTrend}% <span data-i18n="statChangeVsLastWeek">vs semaine dernière</span>`;
      trendElement.style.color = "#ff6b6b"; // Bad trend (more posts)
    } else if (weeklyTrend < 0) {
      trendElement.innerHTML = `↓ ${Math.abs(weeklyTrend)}% <span data-i18n="statChangeVsLastWeek">vs semaine dernière</span>`;
      trendElement.style.color = "#4ade80"; // Good trend (fewer posts)
    } else {
      trendElement.innerHTML = `→ 0% <span data-i18n="statChangeVsLastWeek">vs semaine dernière</span>`;
      trendElement.style.color = "#e0e0e0";
    }

    // Avg time per post
    const avgTimeMsg =
      chrome.i18n.getMessage("avgTimePerPost") || "~{time} min par post";
    document.getElementById("avgTimePerPost").textContent = avgTimeMsg.replace(
      "{time}",
      analytics.avgTimePerPost || 0,
    );

    // Calm days
    const calmDaysMsg =
      chrome.i18n.getMessage("calmDays") || "{count} jours calmes";
    document.getElementById("calmDaysInfo").textContent = calmDaysMsg.replace(
      "{count}",
      analytics.calmDays || 0,
    );

    // Longest streak
    const longestStreakMsg =
      chrome.i18n.getMessage("longestStreakLabel") || "Record: {count} jours";
    document.getElementById("longestStreak").textContent =
      longestStreakMsg.replace("{count}", analytics.longestStreak || 0);

    // Peak hour
    document.getElementById("peakHour").textContent =
      analytics.peakHour || "--";
    const peakHourMsg =
      chrome.i18n.getMessage("ofYourPosts") || "{percent}% de tes posts";
    document.getElementById("peakHourPercent").textContent =
      peakHourMsg.replace("{percent}", analytics.peakHourPercentage || 0);

    // Best day
    if (analytics.bestDay) {
      document.getElementById("bestDayCount").textContent =
        analytics.bestDay.count;
      const date = new Date(analytics.bestDay.date);
      document.getElementById("bestDayDate").textContent =
        date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } else {
      document.getElementById("bestDayCount").textContent = "0";
      document.getElementById("bestDayDate").textContent = "--";
    }

    // Anger score
    document.getElementById("angerScore").textContent =
      analytics.angerIntensityScore || "0.0";

    // Weekday vs weekend
    document.getElementById("weekdayPercent").textContent =
      `${analytics.weekdayPercentage || 0}%`;
    const weekendMsg =
      chrome.i18n.getMessage("weekendPercent") || "{percent}% le weekend";
    document.getElementById("weekendPercent").textContent = weekendMsg.replace(
      "{percent}",
      analytics.weekendPercentage || 0,
    );

    // Render charts
    renderEmotionalActivityChart(daily);
    renderPlatformChart(analytics.platformPercentages || {});
    renderEmotionChart(analytics.emotionPercentages || {});
    renderHourlyPatternChart(analytics.hourlyPercentages || {});
    renderMonthlyTrendChart(daily);

    // Render insights
    renderInsights(insights || []);

    // Render recent posts (from local storage for now)
    loadLocalPostsList();
  }

  function renderEmotionalActivityChart(dailyData) {
    const canvas = document.getElementById("emotionalActivityChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    if (!dailyData || dailyData.length === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font =
        '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = "center";
      const noDataMsg =
        chrome.i18n.getMessage("noDataAvailable") || "Aucune donnée disponible";
      ctx.fillText(noDataMsg, width / 2, height / 2);
      return;
    }

    // Prepare data (last 7 days)
    const chartData = dailyData.slice(0, 7).reverse();
    const emotionColors = {
      anger: "#ff6b6b",
      frustration: "#ffa500",
      irritation: "#ffcc00",
      neutral: "#4ade80",
    };

    const barWidth = (width / chartData.length) * 0.7;
    const gap = (width / chartData.length) * 0.3;
    const maxValue = Math.max(
      ...chartData.map(
        (d) =>
          d.emotions.anger +
          d.emotions.frustration +
          d.emotions.irritation +
          d.emotions.neutral,
      ),
      1,
    );

    const chartHeight = height - 60;

    chartData.forEach((day, i) => {
      const x = i * (barWidth + gap) + gap / 2;
      const total =
        day.emotions.anger +
        day.emotions.frustration +
        day.emotions.irritation +
        day.emotions.neutral;
      let yOffset = chartHeight; // Declare outside the if/else

      if (total === 0) {
        // Draw empty state bar
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(x, 40, barWidth, chartHeight - 40);
      } else {
        // Draw stacked bars
        ["neutral", "irritation", "frustration", "anger"].forEach((emotion) => {
          const value = day.emotions[emotion] || 0;
          const barHeight = (value / maxValue) * (chartHeight - 40);

          if (barHeight > 0) {
            ctx.fillStyle = emotionColors[emotion];
            ctx.fillRect(x, yOffset - barHeight, barWidth, barHeight);
            yOffset -= barHeight;
          }
        });
      }

      // Draw date label
      const date = new Date(day.date);
      const todayLabel = chrome.i18n.getMessage("todayShort") || "Today";
      const label =
        i === chartData.length - 1
          ? todayLabel
          : date.toLocaleDateString("fr-FR", { weekday: "short" });
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "12px -apple-system";
      ctx.textAlign = "center";
      ctx.fillText(label, x + barWidth / 2, height - 10);

      // Draw post count
      if (total > 0) {
        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold 14px -apple-system";
        ctx.fillText(total.toString(), x + barWidth / 2, yOffset - 5);
      }
    });

    // Draw legend
    const legendY = 15;
    let legendX = 10;
    const emotions = [
      {
        key: "anger",
        label: chrome.i18n.getMessage("chartLabelAnger") || "Anger",
      },
      {
        key: "frustration",
        label: chrome.i18n.getMessage("chartLabelFrustration") || "Frustration",
      },
      {
        key: "irritation",
        label: chrome.i18n.getMessage("chartLabelIrritation") || "Irritation",
      },
      {
        key: "neutral",
        label: chrome.i18n.getMessage("chartLabelNeutral") || "Neutral",
      },
    ];

    emotions.forEach((emotion) => {
      ctx.fillStyle = emotionColors[emotion.key];
      ctx.fillRect(legendX, legendY, 12, 12);
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "11px -apple-system";
      ctx.textAlign = "left";
      ctx.fillText(emotion.label, legendX + 16, legendY + 10);
      legendX += ctx.measureText(emotion.label).width + 30;
    });
  }

  function renderPlatformChart(percentages) {
    const canvas = document.getElementById("platformChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const platforms = [
      { key: "twitter", label: "Twitter", color: "#1DA1F2" },
      { key: "reddit", label: "Reddit", color: "#FF4500" },
      { key: "facebook", label: "Facebook", color: "#1877F2" },
      { key: "linkedin", label: "LinkedIn", color: "#0A66C2" },
    ];

    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "14px -apple-system";
      ctx.textAlign = "center";
      const noDataMsg =
        chrome.i18n.getMessage("noDataAvailable") || "No data available";
      ctx.fillText(noDataMsg, width / 2, height / 2);
      return;
    }

    // Draw pie chart
    const centerX = width / 3;
    const centerY = height / 2;
    const radius = Math.min(width / 3, height / 2) * 0.8;

    let currentAngle = -Math.PI / 2;

    platforms.forEach((platform) => {
      const percent = percentages[platform.key] || 0;
      if (percent > 0) {
        const sliceAngle = (percent / 100) * 2 * Math.PI;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(
          centerX,
          centerY,
          radius,
          currentAngle,
          currentAngle + sliceAngle,
        );
        ctx.closePath();
        ctx.fillStyle = platform.color;
        ctx.fill();

        currentAngle += sliceAngle;
      }
    });

    // Draw legend on the right
    let legendY = height / 2 - (platforms.length * 30) / 2;
    const legendX = width * 0.6;

    platforms.forEach((platform) => {
      const percent = percentages[platform.key] || 0;

      // Draw color box
      ctx.fillStyle = platform.color;
      ctx.fillRect(legendX, legendY, 15, 15);

      // Draw label
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "13px -apple-system";
      ctx.textAlign = "left";
      ctx.fillText(
        `${platform.label}${percent > 0 ? ": " + percent + "%" : ""}`,
        legendX + 20,
        legendY + 12,
      );

      legendY += 30;
    });
  }

  function renderEmotionChart(percentages) {
    const canvas = document.getElementById("emotionChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const emotions = [
      {
        key: "anger",
        label: chrome.i18n.getMessage("chartLabelAnger") || "Anger",
        color: "#ff6b6b",
      },
      {
        key: "frustration",
        label: chrome.i18n.getMessage("chartLabelFrustration") || "Frustration",
        color: "#ffa500",
      },
      {
        key: "irritation",
        label: chrome.i18n.getMessage("chartLabelIrritation") || "Irritation",
        color: "#ffcc00",
      },
      {
        key: "neutral",
        label: chrome.i18n.getMessage("chartLabelNeutral") || "Neutral",
        color: "#4ade80",
      },
    ];

    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "14px -apple-system";
      ctx.textAlign = "center";
      const noDataMsg =
        chrome.i18n.getMessage("noDataAvailable") || "No data available";
      ctx.fillText(noDataMsg, width / 2, height / 2);
      return;
    }

    // Draw pie chart
    const centerX = width / 3;
    const centerY = height / 2;
    const radius = Math.min(width / 3, height / 2) * 0.8;

    let currentAngle = -Math.PI / 2;

    emotions.forEach((emotion) => {
      const percent = percentages[emotion.key] || 0;
      if (percent > 0) {
        const sliceAngle = (percent / 100) * 2 * Math.PI;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(
          centerX,
          centerY,
          radius,
          currentAngle,
          currentAngle + sliceAngle,
        );
        ctx.closePath();
        ctx.fillStyle = emotion.color;
        ctx.fill();

        currentAngle += sliceAngle;
      }
    });

    // Draw legend on the right
    let legendY = height / 2 - (emotions.length * 30) / 2;
    const legendX = width * 0.6;

    emotions.forEach((emotion) => {
      const percent = percentages[emotion.key] || 0;

      // Draw color box
      ctx.fillStyle = emotion.color;
      ctx.fillRect(legendX, legendY, 15, 15);

      // Draw label
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "13px -apple-system";
      ctx.textAlign = "left";
      ctx.fillText(
        `${emotion.label}${percent > 0 ? ": " + percent + "%" : ""}`,
        legendX + 20,
        legendY + 12,
      );

      legendY += 30;
    });
  }

  function renderHourlyPatternChart(hourlyPercentages) {
    const canvas = document.getElementById("hourlyPatternChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const hours = [
      { key: "00-05", label: "00h-05h" },
      { key: "06-11", label: "06h-11h" },
      { key: "12-17", label: "12h-17h" },
      { key: "18-23", label: "18h-23h" },
    ];

    const maxPercent = Math.max(...Object.values(hourlyPercentages), 1);
    const barWidth = (width / hours.length) * 0.7;
    const gap = (width / hours.length) * 0.3;
    const chartHeight = height - 60;

    hours.forEach((hour, i) => {
      const percent = hourlyPercentages[hour.key] || 0;
      const barHeight = (percent / maxPercent) * (chartHeight - 40);
      const x = i * (barWidth + gap) + gap / 2;
      const y = chartHeight - barHeight;

      // Draw bar
      const gradient = ctx.createLinearGradient(0, y, 0, chartHeight);
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(1, "#764ba2");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw percentage label
      if (percent > 0) {
        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold 14px -apple-system";
        ctx.textAlign = "center";
        ctx.fillText(`${percent}%`, x + barWidth / 2, y - 10);
      }

      // Draw hour label
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "12px -apple-system";
      ctx.textAlign = "center";
      ctx.fillText(hour.label, x + barWidth / 2, height - 10);
    });
  }

  function renderMonthlyTrendChart(dailyData) {
    const canvas = document.getElementById("monthlyTrendChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    if (!dailyData || dailyData.length === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "14px -apple-system";
      ctx.textAlign = "center";
      const noDataMsg =
        chrome.i18n.getMessage("noDataAvailable") || "No data available";
      ctx.fillText(noDataMsg, width / 2, height / 2);
      return;
    }

    // Group by week
    const weeklyData = [];
    const weeks = Math.min(Math.ceil(dailyData.length / 7), 12);

    for (let i = 0; i < weeks; i++) {
      const weekData = dailyData.slice(i * 7, (i + 1) * 7);
      const total = weekData.reduce((sum, day) => sum + (day.posts || 0), 0);
      weeklyData.push({
        week: weeks - i,
        total: total,
        date: weekData[0]?.date,
      });
    }

    weeklyData.reverse();

    const maxPosts = Math.max(...weeklyData.map((w) => w.total), 1);
    const pointSpacing = width / (weeklyData.length + 1);
    const chartHeight = height - 60;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = "#667eea";
    ctx.lineWidth = 3;

    weeklyData.forEach((week, i) => {
      const x = (i + 1) * pointSpacing;
      const y = chartHeight - (week.total / maxPosts) * (chartHeight - 40);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Draw point
      ctx.fillStyle = "#667eea";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw value
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "bold 12px -apple-system";
      ctx.textAlign = "center";
      ctx.fillText(week.total.toString(), x, y - 10);

      // Draw week label with date
      const date = new Date(week.date);
      const label = date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
      ctx.font = "11px -apple-system";
      ctx.fillText(label, x, height - 10);
    });

    ctx.stroke();
  }

  function renderInsights(insights) {
    const container = document.getElementById("insightsList");
    if (!container) return;

    if (!insights || insights.length === 0) {
      container.innerHTML = `
        <div class="insight-card">
          <h3>💡 Insights personnalisés</h3>
          <p>Commence à utiliser Eumenides pour voir tes patterns et insights personnalisés.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = insights
      .map(
        (insight) => `
      <div class="insight-card">
        <h3>${insight.icon} ${
          insight.type === "pattern"
            ? "Pattern détecté"
            : insight.type === "emotion"
              ? "Composition émotionnelle"
              : insight.type === "platform"
                ? "Plateforme déclencheur"
                : insight.type === "improvement"
                  ? "Amélioration"
                  : insight.type === "achievement"
                    ? "Achievement"
                    : "Insight"
        }</h3>
        <p>${insight.message}</p>
      </div>
    `,
      )
      .join("");
  }

  function loadLocalPostsList() {
    chrome.storage.local.get(["history"], (data) => {
      const history = data.history || [];
      const recentPosts = history.slice(0, 10);

      const container = document.getElementById("recentPostsList");
      if (!container) return;

      if (recentPosts.length === 0) {
        container.innerHTML =
          '<p style="opacity: 0.5; text-align: center; padding: 20px;">Aucun post intercepté pour le moment</p>';
        return;
      }

      container.innerHTML = recentPosts
        .map((post) => {
          const time = formatTimeAgo(post.timestamp);
          const emotion = post.emotion || "neutral";
          const platform = post.platform || "unknown";

          return `
          <div class="post-item">
            <div class="post-header">
              <span class="post-platform">${platform.toUpperCase()}</span>
              <span class="post-time">${time}</span>
            </div>
            <div class="post-content">${post.content || ""}</div>
            <span class="post-emotion">${emotion}</span>
          </div>
        `;
        })
        .join("");
    });
  }

  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return "Hier";
    return `Il y a ${days}j`;
  }

  function loadLocalData() {
    // Fallback to local storage if API fails or not premium
    chrome.storage.local.get(["history"], (data) => {
      const history = data.history || [];

      // Calculate basic stats from local data
      const analytics = calculateLocalStats(history);

      // Render with local data
      renderAllStats({
        analytics: analytics,
        insights: [],
        daily: groupByDay(history),
        totals: {},
      });
    });
  }

  function calculateLocalStats(history) {
    const totalPosts = history.length;
    const timeSavedMinutes = history.reduce(
      (sum, p) => sum + (p.timeSaved || 3),
      0,
    );

    return {
      postsIntercepted: totalPosts,
      timeSavedMinutes: timeSavedMinutes,
      timeSavedHours: Math.round((timeSavedMinutes / 60) * 10) / 10,
      regretsAvoided: totalPosts > 0 ? 100 : 0,
      currentStreak: 0,
      longestStreak: 0,
      weeklyTrend: 0,
      peakHour: "--",
      peakHourPercentage: 0,
      hourlyDistribution: {},
      hourlyPercentages: {},
      platformDistribution: {},
      platformPercentages: {},
      emotionDistribution: {},
      emotionPercentages: {},
      avgTimePerPost:
        totalPosts > 0 ? Math.round(timeSavedMinutes / totalPosts) : 0,
      bestDay: null,
      calmDays: 0,
      activeDays: 0,
      weekdayPercentage: 0,
      weekendPercentage: 0,
      angerIntensityScore: 0,
    };
  }

  function groupByDay(history) {
    const days = {};
    history.forEach((post) => {
      const date = new Date(post.timestamp).toISOString().split("T")[0];
      if (!days[date]) {
        days[date] = {
          date: date,
          posts: 0,
          timeSaved: 0,
          emotions: { anger: 0, frustration: 0, irritation: 0, neutral: 0 },
        };
      }
      days[date].posts++;
      days[date].timeSaved += post.timeSaved || 3;
      const emotion = post.emotion || "neutral";
      days[date].emotions[emotion]++;
    });

    return Object.values(days).sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  }
});
