ALTER TABLE shopping_list
ADD COLUMN IF NOT EXISTS is_purchased BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS added_by_user_id TEXT,
ADD COLUMN IF NOT EXISTS household_id BIGINT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE shopping_list SET added_by_user_id = user_id WHERE added_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_household_id ON shopping_list(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_is_purchased ON shopping_list(is_purchased);
