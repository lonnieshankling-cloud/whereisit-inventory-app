import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface RemoveMemberRequest {
  user_id: string;
}

export const removeMember = api(
  { method: "POST", path: "/household/remove-member", expose: true, auth: true },
  async (req: RemoveMemberRequest): Promise<void> => {
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
      throw new Error("Only household owner can remove members");
    }

    if (req.user_id === auth.userID) {
      throw new Error("Cannot remove yourself from the household");
    }

    const memberResult = await db.queryRow`
      SELECT household_id FROM users WHERE id = ${req.user_id}
    `;

    if (!memberResult || memberResult.household_id !== userResult.household_id) {
      throw new Error("User is not a member of your household");
    }

    await db.exec`
      UPDATE users SET household_id = NULL WHERE id = ${req.user_id}
    `;
  }
);
