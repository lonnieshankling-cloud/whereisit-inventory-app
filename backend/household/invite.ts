import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { sendInvitationEmail } from "../email/send";

export interface InviteRequest {
  invited_email: string;
}

export interface InviteResponse {
  id: number;
  invited_email: string;
  status: string;
  invitation_code: string;
}

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
      
      // Get household name for email
      const householdResult = await db.queryRow<{ name: string }>`
        SELECT name FROM households WHERE id = ${userResult.household_id}
      `;
      
      // Generate unique invitation code with retry logic
      let invitationCode = generateInvitationCode();
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          const invitationResult = await db.queryRow<{ id: number; invited_email: string; status: string; invitation_code: string }>`
            INSERT INTO household_invitations (household_id, invited_email, status, invitation_code)
            VALUES (${userResult.household_id}, ${req.invited_email}, 'pending', ${invitationCode})
            RETURNING id, invited_email, status, invitation_code
          `;

          console.log("[Invite] Invitation created successfully:", invitationResult);
          
          // Send invitation email (fire and forget)
          if (householdResult?.name) {
            sendInvitationEmail(req.invited_email, householdResult.name, invitationCode).catch(err => {
              console.error("[Invite] Email sending failed (non-blocking):", err);
            });
          }
          
          return invitationResult!;
        } catch (err: any) {
          // If duplicate code, generate a new one and retry
          if (err?.message?.includes('idx_household_invitations_code') || err?.message?.includes('duplicate')) {
            invitationCode = generateInvitationCode();
            attempts++;
            console.log(`[Invite] Code collision, retrying with new code (attempt ${attempts})`);
          } else {
            throw err;
          }
        }
      }
      
      throw new Error("Failed to generate unique invitation code after multiple attempts");
    } catch (err) {
      console.error("[Invite] Failed:", err);
      throw err;
    }
  }
);
