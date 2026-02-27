-- Rollback: Remove subscription tracking columns
DROP INDEX IF EXISTS idx_users_subscription_status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_renew_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
