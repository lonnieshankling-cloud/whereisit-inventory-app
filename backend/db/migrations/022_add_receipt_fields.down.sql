-- Remove receipt and warranty fields
DROP TABLE IF EXISTS item_receipts;
ALTER TABLE items DROP COLUMN IF EXISTS purchase_date;
ALTER TABLE items DROP COLUMN IF EXISTS purchase_price;
ALTER TABLE items DROP COLUMN IF EXISTS purchase_store;
ALTER TABLE items DROP COLUMN IF EXISTS warranty_until;
