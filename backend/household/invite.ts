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
    const auth = getAuthData()!;

    const userResult = await db.queryRow`
      SELECT household_id FROM users WHERE id = ${auth.userID}
    `;

    if (!userResult || !userResult.household_id) {
      throw new Error("You must be part of a household to invite members");
    }

    const invitationResult = await db.queryRow<{ id: number; invited_email: string; status: string }>`
      INSERT INTO household_invitations (household_id, invited_email, status)
      VALUES (${userResult.household_id}, ${req.invited_email}, 'pending')
      RETURNING id, invited_email, status
    `;

    return invitationResult!;
  }
);
