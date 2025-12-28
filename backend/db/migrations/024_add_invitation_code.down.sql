DROP INDEX IF EXISTS idx_household_invitations_code;
ALTER TABLE household_invitations DROP COLUMN IF EXISTS invitation_code;
