ALTER TABLE household_invitations ADD COLUMN invitation_code TEXT;

CREATE UNIQUE INDEX idx_household_invitations_code ON household_invitations(invitation_code) WHERE invitation_code IS NOT NULL;
