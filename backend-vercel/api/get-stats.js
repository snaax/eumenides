const { pool } = require('../lib/database');
const { validateEmail } = require('../lib/validators');

/**
 * Get user's aggregated stats
 * Returns anonymized stats for the user to see in their dashboard
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    const result = await pool.query(`
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
    `, [email, daysLimit]);

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => ({
      postsIntercepted: acc.postsIntercepted + row.posts_intercepted,
      timeSavedMinutes: acc.timeSavedMinutes + row.time_saved_minutes,
      emotions: {
        anger: acc.emotions.anger + row.emotion_anger,
        frustration: acc.emotions.frustration + row.emotion_frustration,
        irritation: acc.emotions.irritation + row.emotion_irritation,
        neutral: acc.emotions.neutral + row.emotion_neutral
      },
      platforms: {
        twitter: acc.platforms.twitter + row.platform_twitter,
        reddit: acc.platforms.reddit + row.platform_reddit,
        facebook: acc.platforms.facebook + row.platform_facebook,
        linkedin: acc.platforms.linkedin + row.platform_linkedin
      },
      hourlyPattern: {
        '00-05': acc.hourlyPattern['00-05'] + row.hour_00_05,
        '06-11': acc.hourlyPattern['06-11'] + row.hour_06_11,
        '12-17': acc.hourlyPattern['12-17'] + row.hour_12_17,
        '18-23': acc.hourlyPattern['18-23'] + row.hour_18_23
      }
    }), {
      postsIntercepted: 0,
      timeSavedMinutes: 0,
      emotions: { anger: 0, frustration: 0, irritation: 0, neutral: 0 },
      platforms: { twitter: 0, reddit: 0, facebook: 0, linkedin: 0 },
      hourlyPattern: { '00-05': 0, '06-11': 0, '12-17': 0, '18-23': 0 }
    });

    // Calculate daily average
    const activeDays = result.rows.filter(r => r.posts_intercepted > 0).length;
    const avgPostsPerDay = activeDays > 0 ? totals.postsIntercepted / activeDays : 0;

    res.status(200).json({
      success: true,
      period: {
        days: daysLimit,
        from: result.rows.length > 0 ? result.rows[result.rows.length - 1].stat_date : null,
        to: result.rows.length > 0 ? result.rows[0].stat_date : null
      },
      totals,
      averages: {
        postsPerDay: Math.round(avgPostsPerDay * 10) / 10,
        minutesPerDay: Math.round((totals.timeSavedMinutes / Math.max(activeDays, 1)) * 10) / 10
      },
      daily: result.rows.map(row => ({
        date: row.stat_date,
        posts: row.posts_intercepted,
        timeSaved: row.time_saved_minutes,
        emotions: {
          anger: row.emotion_anger,
          frustration: row.emotion_frustration,
          irritation: row.emotion_irritation,
          neutral: row.emotion_neutral
        }
      }))
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
