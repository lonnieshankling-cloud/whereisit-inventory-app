import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface HouseholdInvitation {
  id: number;
  household_id: number;
  invited_email: string;
  status: string;
  created_at: Date;
}

export interface GetInvitationsResponse {
  invitations: HouseholdInvitation[];
}

export const getInvitations = api(
  { method: "GET", path: "/household/invitations", expose: true, auth: true },
  async (): Promise<GetInvitationsResponse> => {
    const auth = getAuthData()!;

    if (!auth.email) {
      return { invitations: [] };
    }

    const invitationRows = await db.query<HouseholdInvitation>`
      SELECT id, household_id, invited_email, status, created_at
      FROM household_invitations
      WHERE invited_email = ${auth.email} AND status = 'pending'
      ORDER BY created_at DESC
    `;

    const invitations: HouseholdInvitation[] = [];
    for await (const row of invitationRows) {
      invitations.push(row);
    }

    return { invitations };
  }
);
