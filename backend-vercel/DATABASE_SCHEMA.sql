-- Eumenides Premium Backend - Database Schema
-- Run this in Supabase SQL Editor

-- Users table with subscription tiers
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  premium_key VARCHAR(255) UNIQUE NOT NULL,
  premium_until TIMESTAMP NOT NULL,

  -- Subscription tier: 'basic' or 'full'
  subscription_tier VARCHAR(50) DEFAULT 'basic',

  -- Stripe metadata
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_session_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_premium_key ON users(premium_key);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

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

-- Migrations: Run these if you already have a users table
-- Only run if you already have a users table without these columns
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
