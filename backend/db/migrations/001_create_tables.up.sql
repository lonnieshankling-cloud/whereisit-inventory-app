CREATE TABLE locations (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_user_id ON locations(user_id);

CREATE TABLE items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  consumption INTEGER NOT NULL DEFAULT 0,
  expiration_date TIMESTAMP,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_location_id ON items(location_id);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_is_favorite ON items(is_favorite) WHERE is_favorite = TRUE;

CREATE TABLE shopping_list (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopping_list_user_id ON shopping_list(user_id);
