-- Stores processed RevenueCat webhook events for idempotency/replay protection.
CREATE TABLE revenuecat_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  revenuecat_event_id TEXT UNIQUE,
  event_key TEXT NOT NULL UNIQUE,
  app_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_id TEXT,
  original_transaction_id TEXT,
  transaction_at_ms BIGINT,
  received_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenuecat_webhook_events_app_user_id
  ON revenuecat_webhook_events(app_user_id);

CREATE INDEX idx_revenuecat_webhook_events_received_at
  ON revenuecat_webhook_events(received_at DESC);

CREATE INDEX idx_revenuecat_webhook_events_event_id
  ON revenuecat_webhook_events(revenuecat_event_id);

CREATE INDEX idx_revenuecat_webhook_events_event_key
  ON revenuecat_webhook_events(event_key);
