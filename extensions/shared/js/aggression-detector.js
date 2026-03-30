// Eumenides - Aggression Detection Algorithm
// The core intelligence that determines if a post should be intercepted

/**
 * Aggression Detection Algorithm - Multi-language Support
 *
 * This is the heart of Eumenides. It analyzes text content to determine
 * if it contains aggressive, angry, or potentially regrettable language.
 *
 * Scoring System:
 * - Anger words: +2 points each
 * - Very negative words: +3 points each
 * - Frustration words: +1 point each
 * - ALL CAPS (>50% uppercase): +2 points
 * - Excessive punctuation (!!!, ???): +1 point
 * - Personal attacks (@username + negative word): +3 points
 *
 * Thresholds:
 * - High sensitivity: score >= 1 (any indicator)
 * - Medium sensitivity: score >= 2 (balanced, default)
 * - Low sensitivity: score >= 3 (clearly aggressive only)
 *
 * Adding New Languages:
 * 1. Create a new file in js/dictionaries/ (e.g., japanese.js)
 * 2. Follow the same structure as existing dictionaries
 * 3. Add the script to manifest.json before aggression-detector.js
 * 4. The system will automatically include it in detection
 */

(function () {
  "use strict";

  // ============================================================================
  // LOAD DICTIONARIES FROM EXTERNAL FILES
  // ============================================================================

  // Dictionaries are loaded from separate files in js/dictionaries/
  // and stored in window.EUMENIDES_DICTIONARIES
  const LANGUAGE_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};

  // ============================================================================
  // COMBINED WORD LISTS - Automatically built from all languages
  // ============================================================================

  function buildCombinedWordLists() {
    const combined = {
      anger: [],
      very_negative: [],
      frustration: [],
    };

    // Iterate through all loaded languages and combine their word lists
    Object.keys(LANGUAGE_DICTIONARIES).forEach((lang) => {
      const dict = LANGUAGE_DICTIONARIES[lang];

      if (dict.anger_words) {
        combined.anger.push(...dict.anger_words);
      }
      if (dict.very_negative_words) {
        combined.very_negative.push(...dict.very_negative_words);
      }
      if (dict.frustration_words) {
        combined.frustration.push(...dict.frustration_words);
      }
    });

    // Remove duplicates and convert to lowercase
    combined.anger = [...new Set(combined.anger.map((w) => w.toLowerCase()))];
    combined.very_negative = [
      ...new Set(combined.very_negative.map((w) => w.toLowerCase())),
    ];
    combined.frustration = [
      ...new Set(combined.frustration.map((w) => w.toLowerCase())),
    ];

    return combined;
  }

  const WORD_LISTS = buildCombinedWordLists();

  // ============================================================================
  // SCORING WEIGHTS - How much each indicator contributes
  // ============================================================================

  const WEIGHTS = {
    ANGER_WORD: 2,
    VERY_NEGATIVE: 3,
    FRUSTRATION: 1,
    ALL_CAPS: 2,
    EXCESSIVE_PUNCTUATION: 1,
    PERSONAL_ATTACK: 3,
    MOCKERY_CAPS: 2, // NEW: Alternating caps (sArCaSm)
    ANGRY_EMOJI: 2, // NEW: Angry emoji clusters
    PRONOUN_INSULT: 3, // NEW: Direct pronoun + insult
    IMPERATIVE_NEGATIVE: 1.5, // NEW: Commands with negative words
    REPETITION: 1, // NEW: Repeated negative words
  };

  // ============================================================================
  // NEGATION WORDS - Words that negate meaning
  // ============================================================================

  const NEGATION_WORDS = {
    en: [
      "not",
      "no",
      "never",
      "isn't",
      "wasn't",
      "doesn't",
      "won't",
      "don't",
      "didn't",
      "cannot",
      "can't",
      "shouldn't",
      "wouldn't",
      "couldn't",
    ],
    fr: [
      "pas",
      "non",
      "jamais",
      "n'est",
      "n'était",
      "ne",
      "aucun",
      "aucune",
      "ni",
    ],
  };

  const ALL_NEGATIONS = [...NEGATION_WORDS.en, ...NEGATION_WORDS.fr].map((w) =>
    w.toLowerCase(),
  );

  // ============================================================================
  // PERSONAL PRONOUNS - For detecting direct attacks
  // ============================================================================

  const PERSONAL_PRONOUNS = {
    en: ["you", "your", "you're", "yours", "you've", "you'll", "u", "ur"],
    fr: ["tu", "vous", "ton", "ta", "tes", "votre", "vos", "toi"],
  };

  const ALL_PRONOUNS = [...PERSONAL_PRONOUNS.en, ...PERSONAL_PRONOUNS.fr].map(
    (w) => w.toLowerCase(),
  );

  // ============================================================================
  // EMOJI PATTERNS - Angry/aggressive emojis
  // ============================================================================

  const ANGRY_EMOJIS = [
    "😡",
    "🤬",
    "😠",
    "💢",
    "🖕",
    "😤",
    "👎",
    "🤮",
    "💩",
    "🔥",
  ];

  const SARCASTIC_EMOJIS = ["🙄", "😏", "🤡", "💀"];

  // ============================================================================
  // SENSITIVITY THRESHOLDS - Tiered System
  // ============================================================================

  const THRESHOLDS = {
    // Free tier - only balanced
    medium: 2, // Balanced approach (FREE - default)

    // Basic tier - one level up and down from balanced
    "medium-low": 3, // Slightly less sensitive (BASIC)
    "medium-high": 1, // Slightly more sensitive (BASIC)

    // Premium tier - all levels
    minimal: 5, // Minimal detection - only extreme cases (PREMIUM)
    low: 4, // Low sensitivity (PREMIUM)
    high: 1, // High sensitivity - same as medium-high (PREMIUM)
    maximum: 0.5, // Maximum sensitivity - catches everything (PREMIUM)
  };

  // Map old names for backward compatibility
  const SENSITIVITY_ALIASES = {
    balanced: "medium",
    normal: "medium",
    default: "medium",
  };

  // Premium tier requirements
  const SENSITIVITY_TIERS = {
    free: ["medium"],
    basic: ["medium-low", "medium", "medium-high"],
    premium: [
      "minimal",
      "low",
      "medium-low",
      "medium",
      "medium-high",
      "high",
      "maximum",
    ],
  };

  // ============================================================================
  // HELPER FUNCTIONS FOR ENHANCED DETECTION
  // ============================================================================

  /**
   * Check if a word is negated (preceded by negation words)
   * @param {string} text - Full text
   * @param {number} wordIndex - Index where the word appears
   * @returns {boolean} - True if word is negated
   */
  function isNegated(text, wordIndex) {
    // Look at 30 characters before the word
    const before = text
      .substring(Math.max(0, wordIndex - 30), wordIndex)
      .toLowerCase();

    // Check if any negation word appears within 3 words before
    return ALL_NEGATIONS.some((negation) => {
      const negIndex = before.lastIndexOf(negation);
      if (negIndex === -1) return false;

      // Count words between negation and target word
      const between = before.substring(negIndex + negation.length);
      const wordsBetween = between.trim().split(/\s+/).length;

      // Negation is effective if within 3 words
      return wordsBetween <= 3;
    });
  }

  /**
   * Detect mockery through alternating caps (tHiS iS sTuPiD)
   * @param {string} text - Text to analyze
   * @returns {boolean} - True if mockery pattern detected
   */
  function hasMockeryCaps(text) {
    // Match pattern of alternating lowercase and uppercase (at least 3 alternations)
    return /([a-z][A-Z]){3,}|([A-Z][a-z]){3,}/.test(text);
  }

  /**
   * Count angry emojis in text
   * @param {string} text - Text to analyze
   * @returns {number} - Count of angry emojis
   */
  function countAngryEmojis(text) {
    let count = 0;
    ANGRY_EMOJIS.forEach((emoji) => {
      const regex = new RegExp(emoji, "g");
      const matches = text.match(regex);
      if (matches) count += matches.length;
    });
    return count;
  }

  /**
   * Count sarcastic emojis in text
   * @param {string} text - Text to analyze
   * @returns {number} - Count of sarcastic emojis
   */
  function countSarcasticEmojis(text) {
    let count = 0;
    SARCASTIC_EMOJIS.forEach((emoji) => {
      const regex = new RegExp(emoji, "g");
      const matches = text.match(regex);
      if (matches) count += matches.length;
    });
    return count;
  }

  /**
   * Detect pronoun + insult pattern (e.g., "you are stupid")
   * @param {string} text - Text to analyze
   * @param {Array} negativeWords - List of negative words to check
   * @returns {number} - Count of pronoun + insult patterns
   */
  function detectPronounInsults(text, negativeWords) {
    let count = 0;
    const lowerText = text.toLowerCase();

    ALL_PRONOUNS.forEach((pronoun) => {
      const pronounRegex = new RegExp(`\\b${pronoun}\\b`, "gi");
      const matches = [...text.matchAll(pronounRegex)];

      matches.forEach((match) => {
        const startIndex = match.index;
        // Check next 50 characters after pronoun
        const after = lowerText.substring(
          startIndex,
          Math.min(lowerText.length, startIndex + 50),
        );

        // Check if negative word appears within 5 words
        const hasNegativeNearby = negativeWords.some((word) => {
          const wordIndex = after.indexOf(word);
          if (wordIndex === -1) return false;

          // Count words between pronoun and negative word
          const between = after.substring(0, wordIndex);
          const wordsBetween = between.trim().split(/\s+/).length;

          return wordsBetween <= 5;
        });

        if (hasNegativeNearby) count++;
      });
    });

    return count;
  }

  /**
   * Detect word repetition (same negative word used multiple times)
   * @param {string} text - Text to analyze
   * @param {Array} words - Words to check for repetition
   * @returns {number} - Count of repeated words
   */
  function detectRepetition(text, words) {
    let repetitionScore = 0;
    const lowerText = text.toLowerCase();

    words.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches && matches.length > 1) {
        // Add score for repetition (more repetitions = more aggressive)
        repetitionScore += matches.length - 1;
      }
    });

    return repetitionScore;
  }

  // ============================================================================
  // MAIN DETECTION FUNCTION
  // ============================================================================

  /**
   * Analyzes text content to determine if it's aggressive
   *
   * @param {string} text - The text to analyze
   * @param {string} sensitivity - 'low', 'medium', or 'high'
   * @returns {Object} Analysis result
   *   - isAggressive: boolean - Should this be intercepted?
   *   - score: number - Aggression score
   *   - emotion: string - Detected emotion (anger, frustration, neutral)
   *   - reasons: Array<string> - Why it was flagged
   */
  function isAggressiveContent(text, sensitivity = "medium") {
    // Handle empty or null input
    if (!text || text.trim().length === 0) {
      return {
        isAggressive: false,
        score: 0,
        emotion: "neutral",
        reasons: [],
      };
    }

    const reasons = [];
    let score = 0;

    const lowerText = text.toLowerCase();

    // ========================================================================
    // 1. CHECK FOR ANGER WORDS (with negation detection)
    // ========================================================================
    let angerWordCount = 0;
    let negatedAngerWords = 0;
    WORD_LISTS.anger.forEach((word) => {
      const wordRegex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = [...lowerText.matchAll(wordRegex)];

      matches.forEach((match) => {
        const wordIndex = match.index;

        // Check if this word is negated (e.g., "not stupid")
        if (isNegated(text, wordIndex)) {
          negatedAngerWords++;
          // Negated anger words reduce score slightly (benefit of doubt)
          score -= 0.5;
        } else {
          angerWordCount++;
          score += WEIGHTS.ANGER_WORD;
        }
      });
    });

    if (angerWordCount > 0) {
      reasons.push(`anger words (${angerWordCount})`);
    }
    if (negatedAngerWords > 0) {
      reasons.push(`negated anger words (${negatedAngerWords})`);
    }

    // ========================================================================
    // 2. CHECK FOR VERY NEGATIVE WORDS (highest weight)
    // ========================================================================
    let veryNegativeCount = 0;
    WORD_LISTS.very_negative.forEach((word) => {
      if (lowerText.includes(word)) {
        veryNegativeCount++;
        score += WEIGHTS.VERY_NEGATIVE;
      }
    });
    if (veryNegativeCount > 0) {
      reasons.push(`very negative (${veryNegativeCount})`);
    }

    // ========================================================================
    // 3. CHECK FOR FRUSTRATION INDICATORS
    // ========================================================================
    let frustrationCount = 0;
    WORD_LISTS.frustration.forEach((word) => {
      if (lowerText.includes(word)) {
        frustrationCount++;
        score += WEIGHTS.FRUSTRATION;
      }
    });
    if (frustrationCount > 0) {
      reasons.push(`frustration (${frustrationCount})`);
    }

    // ========================================================================
    // 4. CHECK FOR ALL CAPS (shouting indicator)
    // ========================================================================
    const letters = text.replace(/[^a-zA-ZÀ-ÿÀ-ÖØ-öø-ÿ]/g, "");
    if (letters.length > 10) {
      const upperCount = text.replace(/[^A-ZÀ-ÖØ-Þ]/g, "").length;
      const upperRatio = upperCount / letters.length;
      if (upperRatio > 0.5) {
        score += WEIGHTS.ALL_CAPS;
        reasons.push("excessive caps");
      }
    }

    // ========================================================================
    // 5. CHECK FOR EXCESSIVE PUNCTUATION (emphasis/emotion)
    // ========================================================================
    if (/[!?]{3,}/.test(text)) {
      score += WEIGHTS.EXCESSIVE_PUNCTUATION;
      reasons.push("excessive punctuation");
    }

    // ========================================================================
    // 6. CHECK FOR PERSONAL ATTACKS (@username + negative words nearby)
    // ========================================================================
    const mentionPattern = /@\w+/g;
    const mentions = text.match(mentionPattern);
    if (mentions) {
      mentions.forEach((mention) => {
        const mentionIndex = text.indexOf(mention);
        const surroundingText = text
          .substring(
            Math.max(0, mentionIndex - 50),
            Math.min(text.length, mentionIndex + mention.length + 50),
          )
          .toLowerCase();

        const hasNegativeNearby =
          WORD_LISTS.anger.some((word) => surroundingText.includes(word)) ||
          WORD_LISTS.very_negative.some((word) =>
            surroundingText.includes(word),
          );

        if (hasNegativeNearby) {
          score += WEIGHTS.PERSONAL_ATTACK;
          reasons.push("personal attack");
          return; // Only count once per mention
        }
      });
    }

    // ========================================================================
    // 7. CHECK FOR MOCKERY CAPS (aLtErNaTiNg CaPs)
    // ========================================================================
    if (hasMockeryCaps(text)) {
      score += WEIGHTS.MOCKERY_CAPS;
      reasons.push("mockery caps");
    }

    // ========================================================================
    // 8. CHECK FOR ANGRY EMOJIS
    // ========================================================================
    const angryEmojiCount = countAngryEmojis(text);
    if (angryEmojiCount > 0) {
      score += WEIGHTS.ANGRY_EMOJI * Math.min(angryEmojiCount, 3); // Cap at 3 to avoid over-scoring
      reasons.push(`angry emojis (${angryEmojiCount})`);
    }

    // ========================================================================
    // 9. CHECK FOR SARCASTIC EMOJIS (with context)
    // ========================================================================
    const sarcasticEmojiCount = countSarcasticEmojis(text);
    if (
      sarcasticEmojiCount > 0 &&
      (angerWordCount > 0 || veryNegativeCount > 0)
    ) {
      // Only count sarcastic emojis if there's also negative language
      score += 1 * Math.min(sarcasticEmojiCount, 2);
      reasons.push(`sarcastic emojis (${sarcasticEmojiCount})`);
    }

    // ========================================================================
    // 10. CHECK FOR PRONOUN + INSULT PATTERNS (you are stupid)
    // ========================================================================
    const allNegativeWords = [...WORD_LISTS.anger, ...WORD_LISTS.very_negative];
    const pronounInsultCount = detectPronounInsults(text, allNegativeWords);
    if (pronounInsultCount > 0) {
      score += WEIGHTS.PRONOUN_INSULT * pronounInsultCount;
      reasons.push(`direct insults (${pronounInsultCount})`);
    }

    // ========================================================================
    // 11. CHECK FOR WORD REPETITION (stupid stupid stupid)
    // ========================================================================
    const repetitionScore = detectRepetition(text, allNegativeWords);
    if (repetitionScore > 0) {
      score += WEIGHTS.REPETITION * repetitionScore;
      reasons.push(`repetition (${repetitionScore})`);
    }

    // ========================================================================
    // DETERMINE IF AGGRESSIVE BASED ON THRESHOLD
    // ========================================================================
    // Handle aliases (e.g., 'balanced' -> 'medium')
    const resolvedSensitivity = SENSITIVITY_ALIASES[sensitivity] || sensitivity;
    const threshold = THRESHOLDS[resolvedSensitivity] || THRESHOLDS.medium;
    const isAggressive = score >= threshold;

    // ========================================================================
    // CLASSIFY EMOTION
    // ========================================================================
    let emotion = "neutral";
    if (angerWordCount > 0 || veryNegativeCount > 0) {
      emotion = "anger";
    } else if (frustrationCount > 0) {
      emotion = "frustration";
    }

    return {
      isAggressive,
      score,
      emotion,
      reasons,
    };
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Check if a sensitivity level is available for a given tier
   * @param {string} sensitivity - The sensitivity level to check
   * @param {string} tier - 'free', 'basic', or 'premium'
   * @returns {boolean} - Whether the sensitivity is available
   */
  function isSensitivityAvailable(sensitivity, tier = "free") {
    const resolvedSensitivity = SENSITIVITY_ALIASES[sensitivity] || sensitivity;
    const availableLevels = SENSITIVITY_TIERS[tier] || SENSITIVITY_TIERS.free;
    return availableLevels.includes(resolvedSensitivity);
  }

  /**
   * Get the required tier for a sensitivity level
   * @param {string} sensitivity - The sensitivity level
   * @returns {string} - 'free', 'basic', or 'premium'
   */
  function getRequiredTier(sensitivity) {
    const resolvedSensitivity = SENSITIVITY_ALIASES[sensitivity] || sensitivity;

    if (SENSITIVITY_TIERS.free.includes(resolvedSensitivity)) {
      return "free";
    } else if (SENSITIVITY_TIERS.basic.includes(resolvedSensitivity)) {
      return "basic";
    } else if (SENSITIVITY_TIERS.premium.includes(resolvedSensitivity)) {
      return "premium";
    }
    return "free"; // Default fallback
  }

  /**
   * Get all available sensitivity levels for a tier
   * @param {string} tier - 'free', 'basic', or 'premium'
   * @returns {Array} - Array of available sensitivity levels with metadata
   */
  function getAvailableSensitivities(tier = "free") {
    const levels = SENSITIVITY_TIERS[tier] || SENSITIVITY_TIERS.free;
    return levels.map((level) => ({
      value: level,
      threshold: THRESHOLDS[level],
      tier: getRequiredTier(level),
    }));
  }

  /**
   * Get a human-readable explanation of why content was flagged
   */
  function getExplanation(analysis) {
    if (!analysis.isAggressive) {
      return "Content appears neutral or positive.";
    }

    const parts = [
      `Aggression score: ${analysis.score}`,
      `Detected emotion: ${analysis.emotion}`,
    ];

    if (analysis.reasons.length > 0) {
      parts.push(`Reasons: ${analysis.reasons.join(", ")}`);
    }

    return parts.join(". ");
  }

  /**
   * Add a custom word to the detection lists
   * @param {string} word - The word to add
   * @param {string} category - 'anger', 'very_negative', or 'frustration'
   * @param {string} language - Optional language code (for organization)
   */
  function addCustomWord(word, category = "anger", language = "custom") {
    word = word.toLowerCase();

    // Ensure custom language exists
    if (!LANGUAGE_DICTIONARIES[language]) {
      LANGUAGE_DICTIONARIES[language] = {
        language_code: language,
        language_name: "Custom",
        anger_words: [],
        very_negative_words: [],
        frustration_words: [],
      };
    }

    switch (category) {
      case "anger":
        if (!WORD_LISTS.anger.includes(word)) {
          WORD_LISTS.anger.push(word);
          LANGUAGE_DICTIONARIES[language].anger_words.push(word);
        }
        break;
      case "very_negative":
        if (!WORD_LISTS.very_negative.includes(word)) {
          WORD_LISTS.very_negative.push(word);
          LANGUAGE_DICTIONARIES[language].very_negative_words.push(word);
        }
        break;
      case "frustration":
        if (!WORD_LISTS.frustration.includes(word)) {
          WORD_LISTS.frustration.push(word);
          LANGUAGE_DICTIONARIES[language].frustration_words.push(word);
        }
        break;
    }
  }

  /**
   * Add a complete language dictionary
   * @param {string} langCode - Language code (e.g., 'ja', 'zh', 'ar')
   * @param {Object} dictionary - Dictionary object with language_code, language_name, anger_words, very_negative_words, frustration_words
   */
  function addLanguage(langCode, dictionary) {
    LANGUAGE_DICTIONARIES[langCode] = dictionary;

    // Rebuild combined lists
    if (dictionary.anger_words) {
      WORD_LISTS.anger.push(
        ...dictionary.anger_words.map((w) => w.toLowerCase()),
      );
    }
    if (dictionary.very_negative_words) {
      WORD_LISTS.very_negative.push(
        ...dictionary.very_negative_words.map((w) => w.toLowerCase()),
      );
    }
    if (dictionary.frustration_words) {
      WORD_LISTS.frustration.push(
        ...dictionary.frustration_words.map((w) => w.toLowerCase()),
      );
    }

    // Remove duplicates
    WORD_LISTS.anger = [...new Set(WORD_LISTS.anger)];
    WORD_LISTS.very_negative = [...new Set(WORD_LISTS.very_negative)];
    WORD_LISTS.frustration = [...new Set(WORD_LISTS.frustration)];
  }

  /**
   * Get statistics about the word lists
   */
  function getStats() {
    const languageStats = {};
    Object.keys(LANGUAGE_DICTIONARIES).forEach((lang) => {
      const dict = LANGUAGE_DICTIONARIES[lang];
      languageStats[lang] = {
        name: dict.language_name || lang,
        anger: dict.anger_words ? dict.anger_words.length : 0,
        very_negative: dict.very_negative_words
          ? dict.very_negative_words.length
          : 0,
        frustration: dict.frustration_words ? dict.frustration_words.length : 0,
        total:
          (dict.anger_words ? dict.anger_words.length : 0) +
          (dict.very_negative_words ? dict.very_negative_words.length : 0) +
          (dict.frustration_words ? dict.frustration_words.length : 0),
      };
    });

    return {
      totalLanguages: Object.keys(LANGUAGE_DICTIONARIES).length,
      languages: Object.keys(LANGUAGE_DICTIONARIES),
      totalAngerWords: WORD_LISTS.anger.length,
      totalVeryNegativeWords: WORD_LISTS.very_negative.length,
      totalFrustrationWords: WORD_LISTS.frustration.length,
      totalWords:
        WORD_LISTS.anger.length +
        WORD_LISTS.very_negative.length +
        WORD_LISTS.frustration.length,
      byLanguage: languageStats,
    };
  }

  /**
   * Get all supported languages
   */
  function getSupportedLanguages() {
    return Object.keys(LANGUAGE_DICTIONARIES).map((code) => ({
      code: code,
      name: LANGUAGE_DICTIONARIES[code].language_name || code,
    }));
  }

  // ============================================================================
  // EXPORT API
  // ============================================================================

  // Make available globally for content.js to use
  if (typeof window !== "undefined") {
    window.EumenidesDetector = {
      // Main detection function
      isAggressiveContent,

      // Helper functions
      getExplanation,
      getStats,
      getSupportedLanguages,

      // Tier/sensitivity functions
      isSensitivityAvailable,
      getRequiredTier,
      getAvailableSensitivities,

      // Customization functions
      addCustomWord,
      addLanguage,

      // Access to configuration (for advanced customization)
      WEIGHTS,
      THRESHOLDS,
      SENSITIVITY_TIERS,
      LANGUAGE_DICTIONARIES,
    };
  }

  // Also support module export for potential testing
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      isAggressiveContent,
      getExplanation,
      getStats,
      getSupportedLanguages,
      addCustomWord,
      addLanguage,
      WEIGHTS,
      THRESHOLDS,
      LANGUAGE_DICTIONARIES,
    };
  }

  // Log initialization info
  const stats = getStats();
  console.log("Eumenides Aggression Detector loaded:");
  console.log(`  → ${stats.totalLanguages} languages`);
  console.log(`  → ${stats.totalWords} total words`);
  console.log(`  → ${stats.totalAngerWords} anger words`);
  console.log(`  → ${stats.totalVeryNegativeWords} very negative words`);
  console.log(`  → ${stats.totalFrustrationWords} frustration words`);
  Object.keys(stats.byLanguage).forEach((lang) => {
    const langStats = stats.byLanguage[lang];
    console.log(`  → ${langStats.name}: ${langStats.total} words`);
  });
})();
