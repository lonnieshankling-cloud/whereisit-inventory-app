import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { HouseholdInvitation } from "./get_invitations";

export interface GetPendingInvitationsResponse {
  invitations: HouseholdInvitation[];
}

export const getPendingInvitations = api(
  { method: "GET", path: "/household/pending-invitations", expose: true, auth: true },
  async (): Promise<GetPendingInvitationsResponse> => {
    const auth = getAuthData()!;

    const userResult = await db.queryRow`
      SELECT household_id FROM users WHERE id = ${auth.userID}
    `;

    if (!userResult || !userResult.household_id) {
      throw new Error("User is not in a household");
    }

    const householdResult = await db.queryRow`
      SELECT owner_id FROM households WHERE id = ${userResult.household_id}
    `;

    if (householdResult?.owner_id !== auth.userID) {
      throw new Error("Only household owner can view pending invitations");
    }

    const invitationResults: HouseholdInvitation[] = [];
    for await (const invitation of db.query<HouseholdInvitation>`
      SELECT id, household_id, invited_email, status, created_at, updated_at
      FROM household_invitations
      WHERE household_id = ${userResult.household_id} AND status = 'pending'
      ORDER BY created_at DESC
    `) {
      invitationResults.push(invitation);
    }

    return { invitations: invitationResults };
  }
);
