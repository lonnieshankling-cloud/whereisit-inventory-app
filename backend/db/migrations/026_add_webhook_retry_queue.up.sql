-- Webhook retry queue for failed RevenueCat events
-- Implements exponential backoff with dead-letter support
CREATE TABLE webhook_retry_queue (
  id BIGSERIAL PRIMARY KEY,
  webhook_event_id BIGINT REFERENCES revenuecat_webhook_events(id) ON DELETE CASCADE,
  app_user_id TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMP NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  is_dead_lettered BOOLEAN NOT NULL DEFAULT FALSE,
  dead_lettered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queue processing
CREATE INDEX idx_webhook_retry_queue_next_retry_at
  ON webhook_retry_queue(next_retry_at)
  WHERE is_dead_lettered = FALSE;

CREATE INDEX idx_webhook_retry_queue_app_user_id
  ON webhook_retry_queue(app_user_id);

CREATE INDEX idx_webhook_retry_queue_dead_lettered
  ON webhook_retry_queue(is_dead_lettered, created_at DESC);

-- Metrics table for webhook failure tracking (alert thresholds)
CREATE TABLE webhook_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  window_start_at TIMESTAMP NOT NULL,
  window_end_at TIMESTAMP NOT NULL,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_webhook_metrics_window
  ON webhook_metrics(metric_name, window_start_at);

CREATE INDEX idx_webhook_metrics_created_at
  ON webhook_metrics(created_at DESC);
