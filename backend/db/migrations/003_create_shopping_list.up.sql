CREATE TABLE shopping_list_items (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
