CREATE TABLE consumption_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity_remaining INTEGER NOT NULL,
  consumed_quantity INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consumption_history_item_id ON consumption_history(item_id);
CREATE INDEX idx_consumption_history_recorded_at ON consumption_history(recorded_at);
