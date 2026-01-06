const { pool } = require('../lib/database');
const { validateEmail } = require('../lib/validators');

/**
 * Submit daily anonymized stats from extension
 * Privacy-friendly: NO post content, just aggregated numbers
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
    const { email, stats } = req.body;

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Validate stats structure
    if (!stats || typeof stats !== 'object') {
      return res.status(400).json({ error: 'Stats object required' });
    }

    const {
      postsIntercepted = 0,
      timeSavedMinutes = 0,
      emotions = {},
      platforms = {},
      hourlyPattern = {}
    } = stats;

    const today = new Date().toISOString().split('T')[0];

    // Upsert user stats (increment if exists, insert if not)
    await pool.query(`
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
    `, [
      email, today,
      postsIntercepted, timeSavedMinutes,
      emotions.anger || 0,
      emotions.frustration || 0,
      emotions.irritation || 0,
      emotions.neutral || 0,
      platforms.twitter || 0,
      platforms.reddit || 0,
      platforms.facebook || 0,
      platforms.linkedin || 0,
      hourlyPattern['00-05'] || 0,
      hourlyPattern['06-11'] || 0,
      hourlyPattern['12-17'] || 0,
      hourlyPattern['18-23'] || 0
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Submit stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
