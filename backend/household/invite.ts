import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface InviteRequest {
  invited_email: string;
}

export interface InviteResponse {
  id: number;
  invited_email: string;
  status: string;
}

export const invite = api(
  { method: "POST", path: "/household/invite", expose: true, auth: true },
  async (req: InviteRequest): Promise<InviteResponse> => {
    try {
      console.log("[Invite] Invitation request for email:", req.invited_email);
      const auth = getAuthData()!;

      const userResult = await db.queryRow`
        SELECT household_id FROM users WHERE id = ${auth.userID}
      `;

      if (!userResult || !userResult.household_id) {
        console.log("[Invite] User not in a household. UserID:", auth.userID);
        throw new Error("You must be part of a household to invite members");
      }

      console.log("[Invite] Creating invitation for household:", userResult.household_id);
      const invitationResult = await db.queryRow<{ id: number; invited_email: string; status: string }>`
        INSERT INTO household_invitations (household_id, invited_email, status)
        VALUES (${userResult.household_id}, ${req.invited_email}, 'pending')
        RETURNING id, invited_email, status
      `;

      console.log("[Invite] Invitation created successfully:", invitationResult);
      return invitationResult!;
    } catch (err) {
      console.error("[Invite] Failed:", err);
      throw err;
    }
  }
);
