CREATE TABLE containers (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id BIGINT REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_containers_user_id ON containers(user_id);
CREATE INDEX idx_containers_household_id ON containers(household_id);
CREATE INDEX idx_containers_location_id ON containers(location_id);

ALTER TABLE items ADD COLUMN container_id BIGINT REFERENCES containers(id) ON DELETE SET NULL;

CREATE INDEX idx_items_container_id ON items(container_id);
