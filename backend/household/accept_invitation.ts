import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface AcceptInvitationRequest {
  invitation_id: number;
}

export interface AcceptInvitationResponse {
  success: boolean;
  household_id: number;
}

export const acceptInvitation = api(
  { method: "POST", path: "/household/accept-invitation", expose: true, auth: true },
  async (req: AcceptInvitationRequest): Promise<AcceptInvitationResponse> => {
    const auth = getAuthData()!;

    if (!auth.email) {
      throw new Error("User email is required");
    }

    const invitation = await db.queryRow<{ household_id: number; invited_email: string; status: string }>`
      SELECT household_id, invited_email, status
      FROM household_invitations
      WHERE id = ${req.invitation_id}
    `;

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.invited_email !== auth.email) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== 'pending') {
      throw new Error("This invitation has already been processed");
    }

    await db.exec`
      UPDATE users
      SET household_id = ${invitation.household_id}
      WHERE id = ${auth.userID}
    `;

    await db.exec`
      UPDATE household_invitations
      SET status = 'accepted', updated_at = NOW()
      WHERE id = ${req.invitation_id}
    `;

    return {
      success: true,
      household_id: invitation.household_id
    };
  }
);
