import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface HouseholdInvitation {
  id: number;
  household_id: number;
  invited_email: string;
  status: string;
  created_at: Date;
  invitation_code?: string;
}

export interface GetInvitationsResponse {
  invitations: HouseholdInvitation[];
}

export const getInvitations = api(
  { method: "GET", path: "/household/invitations", expose: true, auth: true },
  async (): Promise<GetInvitationsResponse> => {
    try {
      const auth = getAuthData()!;
      console.log("[GetInvitations] Request from user:", auth.userID);

      // Get the user's household
      const userResult = await db.queryRow`
        SELECT household_id FROM users WHERE id = ${auth.userID}
      `;

      if (!userResult || !userResult.household_id) {
        console.log("[GetInvitations] User not in a household");
        return { invitations: [] };
      }

      console.log("[GetInvitations] Fetching invitations for household:", userResult.household_id);

      const invitationRows = await db.query<HouseholdInvitation>`
        SELECT id, household_id, invited_email, status, created_at, invitation_code
        FROM household_invitations
        WHERE household_id = ${userResult.household_id} AND status = 'pending'
        ORDER BY created_at DESC
      `;

      const invitations: HouseholdInvitation[] = [];
      for await (const row of invitationRows) {
        invitations.push(row);
      }

      console.log("[GetInvitations] Found invitations:", invitations.length);
      return { invitations };
    } catch (err) {
      console.error("[GetInvitations] Failed:", err);
      throw err;
    }
  }
);
