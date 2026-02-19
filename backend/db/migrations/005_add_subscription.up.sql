-- Add subscription tracking columns to users table
-- Tracks RevenueCat purchase status for profile/premium feature gating

ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'expired', 'canceled'));
ALTER TABLE users ADD COLUMN subscription_plan TEXT CHECK (subscription_plan IN ('pro_monthly', 'pro_annual', 'pro_lifetime', NULL));
ALTER TABLE users ADD COLUMN subscription_renew_date TIMESTAMP;
ALTER TABLE users ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW();

-- Index for efficient subscription status queries
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
