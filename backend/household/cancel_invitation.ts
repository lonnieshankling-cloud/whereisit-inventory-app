import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface CancelInvitationRequest {
  invitation_id: number;
}

export const cancelInvitation = api(
  { method: "POST", path: "/household/cancel-invitation", expose: true, auth: true },
  async (req: CancelInvitationRequest): Promise<void> => {
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
      throw new Error("Only household owner can cancel invitations");
    }

    const invitationResult = await db.queryRow`
      SELECT household_id FROM household_invitations WHERE id = ${req.invitation_id}
    `;

    if (!invitationResult || invitationResult.household_id !== userResult.household_id) {
      throw new Error("Invitation not found");
    }

    await db.exec`
      DELETE FROM household_invitations WHERE id = ${req.invitation_id}
    `;
  }
);
