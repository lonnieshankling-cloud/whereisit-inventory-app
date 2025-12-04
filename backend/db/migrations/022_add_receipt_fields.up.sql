-- Add receipt and warranty fields to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_store TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS warranty_until DATE;

-- Create receipts table for multiple receipt support
CREATE TABLE IF NOT EXISTS item_receipts (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  thumbnail_url TEXT,
  receipt_type TEXT DEFAULT 'purchase',
  description TEXT,
  extracted_date DATE,
  extracted_price DECIMAL(10, 2),
  extracted_store TEXT,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by TEXT NOT NULL
);

CREATE INDEX idx_item_receipts_item_id ON item_receipts(item_id);
CREATE INDEX idx_item_receipts_uploaded_at ON item_receipts(uploaded_at DESC);
