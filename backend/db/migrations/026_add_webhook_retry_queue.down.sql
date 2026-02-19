DROP INDEX IF EXISTS idx_webhook_metrics_created_at;
DROP INDEX IF EXISTS idx_webhook_metrics_window;
DROP TABLE IF EXISTS webhook_metrics;

DROP INDEX IF EXISTS idx_webhook_retry_queue_dead_lettered;
DROP INDEX IF EXISTS idx_webhook_retry_queue_app_user_id;
DROP INDEX IF EXISTS idx_webhook_retry_queue_next_retry_at;
DROP TABLE IF EXISTS webhook_retry_queue;
