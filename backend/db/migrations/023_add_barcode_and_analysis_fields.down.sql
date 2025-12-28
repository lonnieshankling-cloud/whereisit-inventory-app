-- Rollback: Remove barcode and analysis fields
ALTER TABLE items DROP COLUMN IF EXISTS barcode_upc;
ALTER TABLE items DROP COLUMN IF EXISTS detected_language;
ALTER TABLE items DROP COLUMN IF EXISTS confidence_score;
ALTER TABLE items DROP COLUMN IF EXISTS analysis_metadata;
ALTER TABLE items DROP COLUMN IF EXISTS estimated_dimensions;
ALTER TABLE items DROP COLUMN IF EXISTS expiry_alert_days;
ALTER TABLE items DROP COLUMN IF EXISTS purchase_date;
ALTER TABLE items DROP COLUMN IF EXISTS purchase_price;

DROP INDEX IF EXISTS idx_items_barcode_upc;
DROP INDEX IF EXISTS idx_items_household_barcode;

DROP TABLE IF EXISTS barcode_cache;
