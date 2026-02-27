DROP INDEX IF EXISTS idx_household_invitations_code;
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'household_invitations'
	) THEN
		ALTER TABLE household_invitations DROP COLUMN IF EXISTS invitation_code;
	END IF;
END $$;
