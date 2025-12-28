import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface AcceptInvitationByCodeRequest {
  invitation_code: string;
}

export interface AcceptInvitationByCodeResponse {
  household_id: number;
  household_name: string;
}

export const acceptInvitationByCode = api(
  { method: "POST", path: "/household/accept-by-code", expose: true, auth: true },
  async (req: AcceptInvitationByCodeRequest): Promise<AcceptInvitationByCodeResponse> => {
    try {
      console.log("[AcceptInvitationByCode] Request with code:", req.invitation_code);
      const auth = getAuthData()!;

      // Find the invitation by code
      const invitation = await db.queryRow<{ id: number; household_id: number; invited_email: string }>`
        SELECT id, household_id, invited_email
        FROM household_invitations
        WHERE invitation_code = ${req.invitation_code} AND status = 'pending'
      `;

      if (!invitation) {
        console.log("[AcceptInvitationByCode] Invalid or expired code");
        throw new Error("Invalid or expired invitation code");
      }

      console.log("[AcceptInvitationByCode] Found invitation:", invitation.id);

      // Update user's household_id
      await db.exec`
        UPDATE users
        SET household_id = ${invitation.household_id}
        WHERE id = ${auth.userID}
      `;

      // Mark invitation as accepted
      await db.exec`
        UPDATE household_invitations
        SET status = 'accepted', updated_at = NOW()
        WHERE id = ${invitation.id}
      `;

      // Get household name
      const household = await db.queryRow<{ name: string }>`
        SELECT name FROM households WHERE id = ${invitation.household_id}
      `;

      console.log("[AcceptInvitationByCode] User joined household:", invitation.household_id);

      return {
        household_id: invitation.household_id,
        household_name: household?.name || "Unknown",
      };
    } catch (err) {
      console.error("[AcceptInvitationByCode] Failed:", err);
      throw err;
    }
  }
);
