CREATE TABLE households (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  household_id BIGINT REFERENCES households(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_household_id ON users(household_id);

ALTER TABLE items ADD COLUMN household_id BIGINT REFERENCES households(id) ON DELETE SET NULL;
CREATE INDEX idx_items_household_id ON items(household_id);

ALTER TABLE locations ADD COLUMN household_id BIGINT REFERENCES households(id) ON DELETE SET NULL;
CREATE INDEX idx_locations_household_id ON locations(household_id);

ALTER TABLE shopping_list ADD COLUMN household_id BIGINT REFERENCES households(id) ON DELETE SET NULL;
CREATE INDEX idx_shopping_list_household_id ON shopping_list(household_id);
