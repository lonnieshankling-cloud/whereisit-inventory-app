CREATE TABLE IF NOT EXISTS household_invitations (
	id BIGSERIAL PRIMARY KEY,
	household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
	invited_email TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending',
	invitation_code TEXT,
	created_at TIMESTAMP NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE household_invitations ADD COLUMN IF NOT EXISTS invitation_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_invitations_code ON household_invitations(invitation_code) WHERE invitation_code IS NOT NULL;
