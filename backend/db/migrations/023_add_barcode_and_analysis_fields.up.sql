-- Add barcode and advanced analysis fields to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode_upc TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS detected_language TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;
ALTER TABLE items ADD COLUMN IF NOT EXISTS estimated_dimensions TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS expiry_alert_days INTEGER DEFAULT 30;
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2);

-- Index for fast barcode lookups (critical for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_items_barcode_upc ON items(barcode_upc);
CREATE INDEX IF NOT EXISTS idx_items_household_barcode ON items(household_id, barcode_upc);

-- Create barcode_cache table for API response caching
CREATE TABLE IF NOT EXISTS barcode_cache (
  upc TEXT PRIMARY KEY,
  product_name TEXT,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  size TEXT,
  source TEXT, -- 'off' (Open Food Facts), 'upclookup', etc.
  raw_data JSONB, -- Full API response for future re-processing
  cached_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for cache expiry cleanup
CREATE INDEX IF NOT EXISTS idx_barcode_cache_cached_at ON barcode_cache(cached_at);
