ALTER TABLE items 
ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'household' 
CHECK (privacy_level IN ('private', 'household', 'public'));
