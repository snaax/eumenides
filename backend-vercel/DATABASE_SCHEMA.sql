-- Eumenides Premium Backend - Database Schema
-- Run this in Supabase SQL Editor
-- Updated: 2026-02-25 - Removed premium key system, added email-based validation

-- Users table with subscription tiers
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  premium_until TIMESTAMP NOT NULL,

  -- Subscription tier: 'basic' or 'full'
  subscription_tier VARCHAR(50) DEFAULT 'basic',

  -- Active status for subscription (false when canceled)
  is_active BOOLEAN DEFAULT true,

  -- Stripe metadata
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  stat_date DATE NOT NULL,

  -- Post metrics
  posts_intercepted INTEGER DEFAULT 0,
  time_saved_minutes INTEGER DEFAULT 0,

  -- Emotion breakdown (counts only, no content)
  emotion_anger INTEGER DEFAULT 0,
  emotion_frustration INTEGER DEFAULT 0,
  emotion_irritation INTEGER DEFAULT 0,
  emotion_neutral INTEGER DEFAULT 0,

  -- Platform breakdown (counts only)
  platform_twitter INTEGER DEFAULT 0,
  platform_reddit INTEGER DEFAULT 0,
  platform_facebook INTEGER DEFAULT 0,
  platform_linkedin INTEGER DEFAULT 0,

  -- Time patterns (hourly buckets)
  hour_00_05 INTEGER DEFAULT 0,
  hour_06_11 INTEGER DEFAULT 0,
  hour_12_17 INTEGER DEFAULT 0,
  hour_18_23 INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(email, stat_date)
);

CREATE INDEX idx_user_stats_email ON user_stats(email);
CREATE INDEX idx_user_stats_date ON user_stats(stat_date);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- If you're upgrading from the old premium key system, run MIGRATION_REMOVE_PREMIUM_KEYS.sql
-- to migrate your existing users without data loss.
--
-- For new installations, simply run this schema file.
-- ============================================================================
