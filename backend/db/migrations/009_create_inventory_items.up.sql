CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  detected_text TEXT,
  detected_objects TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_created_at ON inventory_items(created_at DESC);
