const { pool } = require("../lib/database");
const { validateEmail } = require("../lib/validators");
const { handleCors } = require("../lib/cors");

/**
 * Unified stats endpoint
 * POST { email, stats: {...} }  → submit daily stats
 * POST { email, days? }         → get stats
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, stats, days = 30 } = req.body;

  const validation = validateEmail(email);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // --- SUBMIT ---
  if (stats !== undefined) {
    if (typeof stats !== "object") {
      return res.status(400).json({ error: "Stats object required" });
    }

    const {
      postsIntercepted = 0,
      timeSavedMinutes = 0,
      emotions = {},
      platforms = {},
      hourlyPattern = {},
    } = stats;

    const today = new Date().toISOString().split("T")[0];

    try {
      await pool.query(
        `
        INSERT INTO user_stats (
          email, stat_date,
          posts_intercepted, time_saved_minutes,
          emotion_anger, emotion_frustration, emotion_irritation, emotion_neutral,
          platform_twitter, platform_reddit, platform_facebook, platform_linkedin,
          hour_00_05, hour_06_11, hour_12_17, hour_18_23
        ) VALUES (
          $1, $2,
          $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16
        )
        ON CONFLICT (email, stat_date)
        DO UPDATE SET
          posts_intercepted = user_stats.posts_intercepted + EXCLUDED.posts_intercepted,
          time_saved_minutes = user_stats.time_saved_minutes + EXCLUDED.time_saved_minutes,
          emotion_anger = user_stats.emotion_anger + EXCLUDED.emotion_anger,
          emotion_frustration = user_stats.emotion_frustration + EXCLUDED.emotion_frustration,
          emotion_irritation = user_stats.emotion_irritation + EXCLUDED.emotion_irritation,
          emotion_neutral = user_stats.emotion_neutral + EXCLUDED.emotion_neutral,
          platform_twitter = user_stats.platform_twitter + EXCLUDED.platform_twitter,
          platform_reddit = user_stats.platform_reddit + EXCLUDED.platform_reddit,
          platform_facebook = user_stats.platform_facebook + EXCLUDED.platform_facebook,
          platform_linkedin = user_stats.platform_linkedin + EXCLUDED.platform_linkedin,
          hour_00_05 = user_stats.hour_00_05 + EXCLUDED.hour_00_05,
          hour_06_11 = user_stats.hour_06_11 + EXCLUDED.hour_06_11,
          hour_12_17 = user_stats.hour_12_17 + EXCLUDED.hour_12_17,
          hour_18_23 = user_stats.hour_18_23 + EXCLUDED.hour_18_23,
          updated_at = NOW()
      `,
        [
          email,
          today,
          postsIntercepted,
          timeSavedMinutes,
          emotions.anger || 0,
          emotions.frustration || 0,
          emotions.irritation || 0,
          emotions.neutral || 0,
          platforms.twitter || 0,
          platforms.reddit || 0,
          platforms.facebook || 0,
          platforms.linkedin || 0,
          hourlyPattern["00-05"] || 0,
          hourlyPattern["06-11"] || 0,
          hourlyPattern["12-17"] || 0,
          hourlyPattern["18-23"] || 0,
        ],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Submit stats error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // --- GET ---
  try {
    const daysLimit = Math.min(Math.max(parseInt(days) || 30, 1), 365);

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

    const activeDays = result.rows.filter((r) => r.posts_intercepted > 0).length;
    const calmDays = daysLimit - activeDays;

    const bestDayRow = allTimeResult.rows.reduce((best, row) => {
      return !best || row.posts_intercepted > best.posts_intercepted ? row : best;
    }, null);

    let currentStreak = 0;
    const sortedAllTime = [...allTimeResult.rows].sort(
      (a, b) => new Date(b.stat_date) - new Date(a.stat_date),
    );

    for (let i = 0; i < sortedAllTime.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split("T")[0];
      const dayData = sortedAllTime.find((d) => d.stat_date === expectedDateStr);
      if (dayData && dayData.posts_intercepted > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    let longestStreak = 0;
    let currentTempStreak = 0;
    let checkDate = new Date(sortedAllTime[0]?.stat_date || new Date());
    const endDate = new Date(sortedAllTime[sortedAllTime.length - 1]?.stat_date || new Date());

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

    const weekdayWeekendTotals = result.rows.reduce(
      (acc, row) => {
        const date = new Date(row.stat_date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend) acc.weekend += row.posts_intercepted;
        else acc.weekday += row.posts_intercepted;
        return acc;
      },
      { weekday: 0, weekend: 0 },
    );

    const totalPosts = totals.postsIntercepted;
    const totalEmotions =
      totals.emotions.anger + totals.emotions.frustration +
      totals.emotions.irritation + totals.emotions.neutral;
    const totalHours =
      totals.hourlyPattern["00-05"] + totals.hourlyPattern["06-11"] +
      totals.hourlyPattern["12-17"] + totals.hourlyPattern["18-23"];

    const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

    const emotionPercentages = {
      anger: pct(totals.emotions.anger, totalEmotions),
      frustration: pct(totals.emotions.frustration, totalEmotions),
      irritation: pct(totals.emotions.irritation, totalEmotions),
      neutral: pct(totals.emotions.neutral, totalEmotions),
    };
    const platformPercentages = {
      twitter: pct(totals.platforms.twitter, totalPosts),
      reddit: pct(totals.platforms.reddit, totalPosts),
      facebook: pct(totals.platforms.facebook, totalPosts),
      linkedin: pct(totals.platforms.linkedin, totalPosts),
    };
    const hourlyPercentages = {
      "00-05": pct(totals.hourlyPattern["00-05"], totalHours),
      "06-11": pct(totals.hourlyPattern["06-11"], totalHours),
      "12-17": pct(totals.hourlyPattern["12-17"], totalHours),
      "18-23": pct(totals.hourlyPattern["18-23"], totalHours),
    };

    const peakHour = Object.entries(hourlyPercentages).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    const avgTimePerPost = totalPosts > 0 ? Math.round((totals.timeSavedMinutes / totalPosts) * 10) / 10 : 0;
    const angerIntensityScore =
      totalPosts > 0
        ? Math.round(((totals.emotions.anger * 3 + totals.emotions.frustration * 2 + totals.emotions.irritation) / totalPosts) * 10) / 10
        : 0;

    const thisWeek = weeklyComparison.rows[0].this_week || 0;
    const lastWeek = weeklyComparison.rows[0].last_week || 0;
    const weeklyTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
    const weekdayPercentage = pct(weekdayWeekendTotals.weekday, totalPosts);
    const weekendPercentage = pct(weekdayWeekendTotals.weekend, totalPosts);

    const insights = [];
    if (hourlyPercentages[peakHour] > 60)
      insights.push({ type: "pattern", icon: "⏰", message: `Tu postes surtout durant la plage ${peakHour} (${hourlyPercentages[peakHour]}% des posts). Essaye de faire une pause écran durant ces heures.` });
    if (emotionPercentages.anger > 70)
      insights.push({ type: "emotion", icon: "😤", message: `Tes posts sont majoritairement en colère (${emotionPercentages.anger}%). Prends 3 respirations profondes avant de répondre.` });
    const topPlatform = Object.entries(platformPercentages).reduce((a, b) => (a[1] > b[1] ? a : b));
    if (topPlatform[1] > 80)
      insights.push({ type: "platform", icon: "📱", message: `${({ twitter: "Twitter", reddit: "Reddit", facebook: "Facebook", linkedin: "LinkedIn" })[topPlatform[0]]} semble te déclencher (${topPlatform[1]}% des posts). Limite ton temps sur cette plateforme.` });
    if (weeklyTrend < -10)
      insights.push({ type: "improvement", icon: "📈", message: `Excellent! Tu as réduit tes posts de rage de ${Math.abs(weeklyTrend)}% cette semaine.` });
    if (weekdayPercentage > 75)
      insights.push({ type: "pattern", icon: "💼", message: `${weekdayPercentage}% de tes posts sont en semaine. Le travail semble être un déclencheur important.` });
    if (currentStreak >= 7)
      insights.push({ type: "achievement", icon: "🔥", message: `Impressionnant! Tu as un streak de ${currentStreak} jours consécutifs!` });
    if (calmDays > daysLimit / 2)
      insights.push({ type: "improvement", icon: "🧘", message: `Tu as eu ${calmDays} jours calmes sur les ${daysLimit} derniers jours. Continue comme ça!` });

    return res.status(200).json({
      success: true,
      period: {
        days: daysLimit,
        from: result.rows.length > 0 ? result.rows[result.rows.length - 1].stat_date : null,
        to: result.rows.length > 0 ? result.rows[0].stat_date : null,
      },
      totals,
      analytics: {
        postsIntercepted: totalPosts,
        timeSavedMinutes: totals.timeSavedMinutes,
        timeSavedHours: Math.round((totals.timeSavedMinutes / 60) * 10) / 10,
        regretsAvoided: totalPosts > 0 ? 100 : 0,
        currentStreak,
        longestStreak,
        activeDays,
        calmDays,
        weeklyTrend,
        peakHour,
        peakHourPercentage: hourlyPercentages[peakHour],
        hourlyDistribution: totals.hourlyPattern,
        hourlyPercentages,
        platformDistribution: totals.platforms,
        platformPercentages,
        emotionDistribution: totals.emotions,
        emotionPercentages,
        avgTimePerPost,
        bestDay: bestDayRow ? { date: bestDayRow.stat_date, count: bestDayRow.posts_intercepted } : null,
        weekdayPosts: weekdayWeekendTotals.weekday,
        weekendPosts: weekdayWeekendTotals.weekend,
        weekdayPercentage,
        weekendPercentage,
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
    return res.status(500).json({ error: "Server error" });
  }
};
