const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");

/**
 * Get user's comprehensive stats with analytics
 * Returns detailed stats for the user dashboard including insights
 */
module.exports = async (req, res) => {
  // CORS headers (wildcard set in vercel.json, this is for runtime override)
  if (process.env.ALLOWED_ORIGINS) {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGINS);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, days = 30 } = req.body;

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Validate days
    const daysLimit = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    // Get user stats for the last N days
    const result = await pool.query(
      `
      SELECT
        stat_date,
        posts_intercepted,
        time_saved_minutes,
        emotion_anger,
        emotion_frustration,
        emotion_irritation,
        emotion_neutral,
        platform_twitter,
        platform_reddit,
        platform_facebook,
        platform_linkedin,
        hour_00_05,
        hour_06_11,
        hour_12_17,
        hour_18_23
      FROM user_stats
      WHERE email = $1
        AND stat_date >= CURRENT_DATE - $2::integer
      ORDER BY stat_date DESC
    `,
      [email, daysLimit],
    );

    // Get all-time stats for best day / longest streak
    const allTimeResult = await pool.query(
      `
      SELECT
        stat_date,
        posts_intercepted,
        time_saved_minutes
      FROM user_stats
      WHERE email = $1
      ORDER BY stat_date DESC
    `,
      [email],
    );

    // Get weekly comparison
    const weeklyComparison = await pool.query(
      `
      SELECT
        SUM(CASE WHEN stat_date >= CURRENT_DATE - 7 THEN posts_intercepted ELSE 0 END) as this_week,
        SUM(CASE WHEN stat_date >= CURRENT_DATE - 14 AND stat_date < CURRENT_DATE - 7 THEN posts_intercepted ELSE 0 END) as last_week
      FROM user_stats
      WHERE email = $1
    `,
      [email],
    );

    // Calculate totals for period
    const totals = result.rows.reduce(
      (acc, row) => ({
        postsIntercepted: acc.postsIntercepted + row.posts_intercepted,
        timeSavedMinutes: acc.timeSavedMinutes + row.time_saved_minutes,
        emotions: {
          anger: acc.emotions.anger + row.emotion_anger,
          frustration: acc.emotions.frustration + row.emotion_frustration,
          irritation: acc.emotions.irritation + row.emotion_irritation,
          neutral: acc.emotions.neutral + row.emotion_neutral,
        },
        platforms: {
          twitter: acc.platforms.twitter + row.platform_twitter,
          reddit: acc.platforms.reddit + row.platform_reddit,
          facebook: acc.platforms.facebook + row.platform_facebook,
          linkedin: acc.platforms.linkedin + row.platform_linkedin,
        },
        hourlyPattern: {
          "00-05": acc.hourlyPattern["00-05"] + row.hour_00_05,
          "06-11": acc.hourlyPattern["06-11"] + row.hour_06_11,
          "12-17": acc.hourlyPattern["12-17"] + row.hour_12_17,
          "18-23": acc.hourlyPattern["18-23"] + row.hour_18_23,
        },
      }),
      {
        postsIntercepted: 0,
        timeSavedMinutes: 0,
        emotions: { anger: 0, frustration: 0, irritation: 0, neutral: 0 },
        platforms: { twitter: 0, reddit: 0, facebook: 0, linkedin: 0 },
        hourlyPattern: { "00-05": 0, "06-11": 0, "12-17": 0, "18-23": 0 },
      },
    );

    // Calculate active days and calm days
    const activeDays = result.rows.filter(
      (r) => r.posts_intercepted > 0,
    ).length;
    const calmDays = daysLimit - activeDays;

    // Calculate best day ever
    const bestDayRow = allTimeResult.rows.reduce((best, row) => {
      return !best || row.posts_intercepted > best.posts_intercepted
        ? row
        : best;
    }, null);

    // Calculate current streak
    let currentStreak = 0;
    const sortedAllTime = [...allTimeResult.rows].sort(
      (a, b) => new Date(b.stat_date) - new Date(a.stat_date),
    );

    for (let i = 0; i < sortedAllTime.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split("T")[0];

      const dayData = sortedAllTime.find(
        (d) => d.stat_date === expectedDateStr,
      );
      if (dayData && dayData.posts_intercepted > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentTempStreak = 0;
    const allDates = new Set(sortedAllTime.map((r) => r.stat_date));

    let checkDate = new Date(sortedAllTime[0]?.stat_date || new Date());
    const endDate = new Date(
      sortedAllTime[sortedAllTime.length - 1]?.stat_date || new Date(),
    );

    while (checkDate >= endDate) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayData = sortedAllTime.find((d) => d.stat_date === dateStr);

      if (dayData && dayData.posts_intercepted > 0) {
        currentTempStreak++;
        longestStreak = Math.max(longestStreak, currentTempStreak);
      } else {
        currentTempStreak = 0;
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate weekday vs weekend
    const weekdayWeekendTotals = result.rows.reduce(
      (acc, row) => {
        const date = new Date(row.stat_date);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isWeekend) {
          acc.weekend += row.posts_intercepted;
        } else {
          acc.weekday += row.posts_intercepted;
        }
        return acc;
      },
      { weekday: 0, weekend: 0 },
    );

    // Calculate percentages
    const totalPosts = totals.postsIntercepted;
    const totalEmotions =
      totals.emotions.anger +
      totals.emotions.frustration +
      totals.emotions.irritation +
      totals.emotions.neutral;
    const totalHours =
      totals.hourlyPattern["00-05"] +
      totals.hourlyPattern["06-11"] +
      totals.hourlyPattern["12-17"] +
      totals.hourlyPattern["18-23"];

    // Emotion percentages
    const emotionPercentages = {
      anger:
        totalEmotions > 0
          ? Math.round((totals.emotions.anger / totalEmotions) * 100)
          : 0,
      frustration:
        totalEmotions > 0
          ? Math.round((totals.emotions.frustration / totalEmotions) * 100)
          : 0,
      irritation:
        totalEmotions > 0
          ? Math.round((totals.emotions.irritation / totalEmotions) * 100)
          : 0,
      neutral:
        totalEmotions > 0
          ? Math.round((totals.emotions.neutral / totalEmotions) * 100)
          : 0,
    };

    // Platform percentages
    const platformPercentages = {
      twitter:
        totalPosts > 0
          ? Math.round((totals.platforms.twitter / totalPosts) * 100)
          : 0,
      reddit:
        totalPosts > 0
          ? Math.round((totals.platforms.reddit / totalPosts) * 100)
          : 0,
      facebook:
        totalPosts > 0
          ? Math.round((totals.platforms.facebook / totalPosts) * 100)
          : 0,
      linkedin:
        totalPosts > 0
          ? Math.round((totals.platforms.linkedin / totalPosts) * 100)
          : 0,
    };

    // Hourly percentages
    const hourlyPercentages = {
      "00-05":
        totalHours > 0
          ? Math.round((totals.hourlyPattern["00-05"] / totalHours) * 100)
          : 0,
      "06-11":
        totalHours > 0
          ? Math.round((totals.hourlyPattern["06-11"] / totalHours) * 100)
          : 0,
      "12-17":
        totalHours > 0
          ? Math.round((totals.hourlyPattern["12-17"] / totalHours) * 100)
          : 0,
      "18-23":
        totalHours > 0
          ? Math.round((totals.hourlyPattern["18-23"] / totalHours) * 100)
          : 0,
    };

    // Find peak hour
    const peakHour = Object.entries(hourlyPercentages).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    )[0];

    // Calculate average time per post
    const avgTimePerPost =
      totalPosts > 0
        ? Math.round((totals.timeSavedMinutes / totalPosts) * 10) / 10
        : 0;

    // Calculate anger intensity score (weighted: anger=3, frustration=2, irritation=1, neutral=0)
    const angerIntensityScore =
      totalPosts > 0
        ? Math.round(
            ((totals.emotions.anger * 3 +
              totals.emotions.frustration * 2 +
              totals.emotions.irritation * 1) /
              totalPosts) *
              10,
          ) / 10
        : 0;

    // Weekly trend
    const thisWeek = weeklyComparison.rows[0].this_week || 0;
    const lastWeek = weeklyComparison.rows[0].last_week || 0;
    const weeklyTrend =
      lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

    // Weekday vs weekend percentages
    const weekdayPercentage =
      totalPosts > 0
        ? Math.round((weekdayWeekendTotals.weekday / totalPosts) * 100)
        : 0;
    const weekendPercentage =
      totalPosts > 0
        ? Math.round((weekdayWeekendTotals.weekend / totalPosts) * 100)
        : 0;

    // Generate insights
    const insights = [];

    if (hourlyPercentages[peakHour] > 60) {
      insights.push({
        type: "pattern",
        icon: "⏰",
        message: `Tu postes surtout durant la plage ${peakHour} (${hourlyPercentages[peakHour]}% des posts). Essaye de faire une pause écran durant ces heures.`,
      });
    }

    if (emotionPercentages.anger > 70) {
      insights.push({
        type: "emotion",
        icon: "😤",
        message: `Tes posts sont majoritairement en colère (${emotionPercentages.anger}%). Prends 3 respirations profondes avant de répondre.`,
      });
    }

    const topPlatform = Object.entries(platformPercentages).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    );
    if (topPlatform[1] > 80) {
      const platformNames = {
        twitter: "Twitter",
        reddit: "Reddit",
        facebook: "Facebook",
        linkedin: "LinkedIn",
      };
      insights.push({
        type: "platform",
        icon: "📱",
        message: `${platformNames[topPlatform[0]]} semble te déclencher (${topPlatform[1]}% des posts). Limite ton temps sur cette plateforme.`,
      });
    }

    if (weeklyTrend < -10) {
      insights.push({
        type: "improvement",
        icon: "📈",
        message: `Excellent! Tu as réduit tes posts de rage de ${Math.abs(weeklyTrend)}% cette semaine.`,
      });
    }

    if (weekdayPercentage > 75) {
      insights.push({
        type: "pattern",
        icon: "💼",
        message: `${weekdayPercentage}% de tes posts sont en semaine. Le travail semble être un déclencheur important.`,
      });
    }

    if (currentStreak >= 7) {
      insights.push({
        type: "achievement",
        icon: "🔥",
        message: `Impressionnant! Tu as un streak de ${currentStreak} jours consécutifs!`,
      });
    }

    if (calmDays > daysLimit / 2) {
      insights.push({
        type: "improvement",
        icon: "🧘",
        message: `Tu as eu ${calmDays} jours calmes sur les ${daysLimit} derniers jours. Continue comme ça!`,
      });
    }

    res.status(200).json({
      success: true,
      period: {
        days: daysLimit,
        from:
          result.rows.length > 0
            ? result.rows[result.rows.length - 1].stat_date
            : null,
        to: result.rows.length > 0 ? result.rows[0].stat_date : null,
      },
      totals,
      analytics: {
        // Basic metrics
        postsIntercepted: totalPosts,
        timeSavedMinutes: totals.timeSavedMinutes,
        timeSavedHours: Math.round((totals.timeSavedMinutes / 60) * 10) / 10,
        regretsAvoided: totalPosts > 0 ? 100 : 0,

        // Streak stats
        currentStreak,
        longestStreak,

        // Days breakdown
        activeDays,
        calmDays,

        // Trends
        weeklyTrend,

        // Peak hours
        peakHour,
        peakHourPercentage: hourlyPercentages[peakHour],
        hourlyDistribution: totals.hourlyPattern,
        hourlyPercentages,

        // Platform breakdown
        platformDistribution: totals.platforms,
        platformPercentages,

        // Emotional composition
        emotionDistribution: totals.emotions,
        emotionPercentages,

        // Additional metrics
        avgTimePerPost,
        bestDay: bestDayRow
          ? {
              date: bestDayRow.stat_date,
              count: bestDayRow.posts_intercepted,
            }
          : null,

        // Weekday vs weekend
        weekdayPosts: weekdayWeekendTotals.weekday,
        weekendPosts: weekdayWeekendTotals.weekend,
        weekdayPercentage,
        weekendPercentage,

        // Anger intensity
        angerIntensityScore,
      },
      insights,
      daily: result.rows.map((row) => ({
        date: row.stat_date,
        posts: row.posts_intercepted,
        timeSaved: row.time_saved_minutes,
        emotions: {
          anger: row.emotion_anger,
          frustration: row.emotion_frustration,
          irritation: row.emotion_irritation,
          neutral: row.emotion_neutral,
        },
        platforms: {
          twitter: row.platform_twitter,
          reddit: row.platform_reddit,
          facebook: row.platform_facebook,
          linkedin: row.platform_linkedin,
        },
        hours: {
          "00-05": row.hour_00_05,
          "06-11": row.hour_06_11,
          "12-17": row.hour_12_17,
          "18-23": row.hour_18_23,
        },
      })),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
