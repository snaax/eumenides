// Eumenides - ML-Based Toxicity Detection
// Uses TensorFlow.js for advanced context-aware detection

(function () {
  "use strict";

  // ============================================================================
  // ML MODEL CONFIGURATION
  // ============================================================================

  let toxicityModel = null;
  let modelLoading = false;
  let modelLoaded = false;
  let modelError = null;

  const ML_CONFIG = {
    threshold: 0.7, // Confidence threshold for toxicity classification
    maxCacheSize: 100, // Cache up to 100 recent predictions
    cacheExpiryMs: 5 * 60 * 1000, // Cache expires after 5 minutes
  };

  // Prediction cache to avoid re-analyzing the same text
  const predictionCache = new Map();

  // ============================================================================
  // MODEL LOADING
  // ============================================================================

  /**
   * Load the TensorFlow.js toxicity model
   * This is async and will load the model in the background
   */
  async function loadModel() {
    if (modelLoaded || modelLoading) {
      return modelLoaded;
    }

    modelLoading = true;
    console.log("Eumenides ML: Loading toxicity model...");

    try {
      // Check if TensorFlow.js and toxicity model are available
      if (typeof tf === "undefined" || typeof toxicity === "undefined") {
        throw new Error("TensorFlow.js or toxicity model not loaded");
      }

      // Load the toxicity model with our threshold
      toxicityModel = await toxicity.load(ML_CONFIG.threshold);
      modelLoaded = true;
      modelError = null;
      modelLoading = false;

      console.log("Eumenides ML: Toxicity model loaded successfully");
      return true;
    } catch (error) {
      console.error("Eumenides ML: Failed to load model:", error);
      modelError = error.message;
      modelLoading = false;
      modelLoaded = false;
      return false;
    }
  }

  /**
   * Check if ML model is ready to use
   * @returns {boolean} - True if model is loaded and ready
   */
  function isModelReady() {
    return modelLoaded && toxicityModel !== null;
  }

  /**
   * Get model status
   * @returns {Object} - Status information
   */
  function getModelStatus() {
    return {
      loaded: modelLoaded,
      loading: modelLoading,
      error: modelError,
      cacheSize: predictionCache.size,
    };
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get cache key for text
   * @param {string} text - Text to cache
   * @returns {string} - Cache key
   */
  function getCacheKey(text) {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Get cached prediction if available
   * @param {string} text - Text to check
   * @returns {Object|null} - Cached prediction or null
   */
  function getCachedPrediction(text) {
    const key = getCacheKey(text);
    const cached = predictionCache.get(key);

    if (!cached) return null;

    // Check if cache entry is still valid
    const now = Date.now();
    if (now - cached.timestamp > ML_CONFIG.cacheExpiryMs) {
      predictionCache.delete(key);
      return null;
    }

    return cached.prediction;
  }

  /**
   * Cache a prediction
   * @param {string} text - Text that was analyzed
   * @param {Object} prediction - Prediction result
   */
  function cachePrediction(text, prediction) {
    const key = getCacheKey(text);

    // Add to cache
    predictionCache.set(key, {
      timestamp: Date.now(),
      prediction: prediction,
    });

    // Limit cache size
    if (predictionCache.size > ML_CONFIG.maxCacheSize) {
      // Remove oldest entry
      const firstKey = predictionCache.keys().next().value;
      predictionCache.delete(firstKey);
    }
  }

  /**
   * Clear the prediction cache
   */
  function clearCache() {
    predictionCache.clear();
  }

  // ============================================================================
  // ML PREDICTION
  // ============================================================================

  /**
   * Analyze text using ML model
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} - Analysis result
   */
  async function analyzeWithML(text) {
    // Check cache first
    const cached = getCachedPrediction(text);
    if (cached) {
      return cached;
    }

    // Ensure model is loaded
    if (!isModelReady()) {
      const loaded = await loadModel();
      if (!loaded) {
        return {
          success: false,
          error: "ML model not available",
          fallback: true,
        };
      }
    }

    try {
      // Run prediction
      const predictions = await toxicityModel.classify([text]);

      // Process results
      const result = processPredictions(predictions);

      // Cache the result
      cachePrediction(text, result);

      return result;
    } catch (error) {
      console.error("Eumenides ML: Prediction error:", error);
      return {
        success: false,
        error: error.message,
        fallback: true,
      };
    }
  }

  /**
   * Process raw model predictions into usable format
   * @param {Array} predictions - Raw predictions from model
   * @returns {Object} - Processed results
   */
  function processPredictions(predictions) {
    const labels = {};
    let maxProbability = 0;
    let toxicLabels = [];

    predictions.forEach((prediction) => {
      const label = prediction.label;
      const results = prediction.results[0];

      if (results && results.probabilities) {
        const toxicProb = results.probabilities[1]; // Index 1 is "toxic" probability
        labels[label] = {
          isToxic: results.match,
          probability: toxicProb,
        };

        if (results.match) {
          toxicLabels.push(label);
          maxProbability = Math.max(maxProbability, toxicProb);
        }
      }
    });

    const isToxic = toxicLabels.length > 0;

    return {
      success: true,
      isToxic: isToxic,
      confidence: maxProbability,
      labels: labels,
      toxicCategories: toxicLabels,
      detailedResults: {
        toxicity: labels.toxicity?.isToxic || false,
        severe_toxicity: labels.severe_toxicity?.isToxic || false,
        obscene: labels.obscene?.isToxic || false,
        threat: labels.threat?.isToxic || false,
        insult: labels.insult?.isToxic || false,
        identity_attack: labels.identity_attack?.isToxic || false,
      },
    };
  }

  // ============================================================================
  // HYBRID SCORING (ML + Rule-based)
  // ============================================================================

  /**
   * Combine ML predictions with rule-based scoring
   * @param {Object} mlResult - ML analysis result
   * @param {Object} ruleBasedResult - Rule-based analysis result
   * @returns {Object} - Combined result with hybrid score
   */
  function combineScores(mlResult, ruleBasedResult) {
    // If ML failed, fall back to rule-based only
    if (!mlResult.success) {
      return {
        ...ruleBasedResult,
        mlUsed: false,
        fallbackReason: mlResult.error,
      };
    }

    // Calculate hybrid score
    // ML contributes 60%, rule-based contributes 40%
    const ML_WEIGHT = 0.6;
    const RULE_WEIGHT = 0.4;

    // Normalize ML confidence (0-1) to match rule-based scale (0-10)
    const mlScore = mlResult.isToxic ? mlResult.confidence * 10 : 0;

    // Normalize rule-based score (typically 0-15) to 0-10 scale
    const normalizedRuleScore = Math.min(ruleBasedResult.score / 1.5, 10);

    // Combined score
    const hybridScore = mlScore * ML_WEIGHT + normalizedRuleScore * RULE_WEIGHT;

    // Determine if aggressive based on hybrid score
    // Use dynamic threshold based on sensitivity
    const sensitivityThresholds = {
      maximum: 0.5,
      high: 2,
      "medium-high": 3,
      medium: 4,
      "medium-low": 5,
      low: 6,
      minimal: 7,
    };

    const threshold =
      sensitivityThresholds[ruleBasedResult.sensitivity || "medium"] || 4;
    const isAggressive = hybridScore >= threshold;

    // Combine reasons
    const reasons = [...ruleBasedResult.reasons];
    if (mlResult.isToxic) {
      reasons.push(`ML detected: ${mlResult.toxicCategories.join(", ")}`);
    }

    return {
      isAggressive: isAggressive,
      score: hybridScore,
      mlScore: mlScore,
      ruleScore: normalizedRuleScore,
      emotion: ruleBasedResult.emotion,
      reasons: reasons,
      mlUsed: true,
      mlConfidence: mlResult.confidence,
      mlCategories: mlResult.toxicCategories,
      detectedBy: isAggressive ? determineDetectionSource(mlResult, ruleBasedResult) : "none",
    };
  }

  /**
   * Determine what detected the aggression (ML, rules, or both)
   * @param {Object} mlResult - ML result
   * @param {Object} ruleBasedResult - Rule-based result
   * @returns {string} - Detection source
   */
  function determineDetectionSource(mlResult, ruleBasedResult) {
    const mlDetected = mlResult.isToxic;
    const rulesDetected = ruleBasedResult.isAggressive;

    if (mlDetected && rulesDetected) return "both";
    if (mlDetected) return "ml";
    if (rulesDetected) return "rules";
    return "none";
  }

  // ============================================================================
  // SMART DETECTION (Decides when to use ML)
  // ============================================================================

  /**
   * Smart detection: uses ML only when needed
   * Fast-path for obvious cases, ML for borderline cases
   *
   * @param {string} text - Text to analyze
   * @param {Function} ruleBasedDetector - Function that returns rule-based analysis
   * @param {string} sensitivity - Sensitivity level
   * @returns {Promise<Object>} - Analysis result
   */
  async function smartDetect(text, ruleBasedDetector, sensitivity = "medium") {
    // Step 1: Run fast rule-based detection
    const ruleResult = ruleBasedDetector(text, sensitivity);
    ruleResult.sensitivity = sensitivity;

    // Step 2: Decide if ML is needed
    const needsML = shouldUseML(ruleResult);

    if (!needsML) {
      // Fast path: clearly aggressive or clearly safe
      return {
        ...ruleResult,
        mlUsed: false,
        fastPath: true,
      };
    }

    // Step 3: Borderline case - use ML for better accuracy
    try {
      const mlResult = await analyzeWithML(text);
      return combineScores(mlResult, ruleResult);
    } catch (error) {
      console.error("Eumenides ML: Error in smart detection:", error);
      // Fall back to rule-based on error
      return {
        ...ruleResult,
        mlUsed: false,
        fallbackReason: error.message,
      };
    }
  }

  /**
   * Determine if ML analysis is needed based on rule-based score
   * @param {Object} ruleResult - Rule-based detection result
   * @returns {boolean} - True if ML should be used
   */
  function shouldUseML(ruleResult) {
    const score = ruleResult.score;

    // Clearly aggressive (score >= 6): no ML needed
    if (score >= 6) return false;

    // Clearly safe (score <= 0): no ML needed
    if (score <= 0) return false;

    // Borderline cases (1-5): use ML for better accuracy
    return true;
  }

  // ============================================================================
  // EXPORT API
  // ============================================================================

  // Make available globally
  if (typeof window !== "undefined") {
    window.EumenidesML = {
      // Model management
      loadModel,
      isModelReady,
      getModelStatus,

      // Prediction
      analyzeWithML,
      smartDetect,
      combineScores,

      // Cache management
      clearCache,

      // Configuration
      config: ML_CONFIG,
    };
  }

  // Also support module export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      loadModel,
      isModelReady,
      analyzeWithML,
      smartDetect,
      combineScores,
      clearCache,
    };
  }

  // Auto-load model when script loads (in background)
  if (typeof window !== "undefined") {
    // Wait a bit to avoid blocking page load
    setTimeout(() => {
      loadModel().then((loaded) => {
        if (loaded) {
          console.log("Eumenides ML: Model pre-loaded and ready");
        }
      });
    }, 2000);
  }
})();
