ALTER TABLE households ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL;

UPDATE households h
SET owner_id = (
  SELECT id FROM users u WHERE u.household_id = h.id ORDER BY u.created_at ASC LIMIT 1
);

CREATE INDEX idx_households_owner_id ON households(owner_id);
