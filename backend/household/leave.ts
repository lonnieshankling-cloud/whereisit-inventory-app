import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export const leave = api(
  { method: "POST", path: "/household/leave", expose: true, auth: true },
  async (): Promise<void> => {
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

    if (householdResult?.owner_id === auth.userID) {
      throw new Error("Household owner cannot leave. Transfer ownership or delete the household first.");
    }

    await db.exec`
      UPDATE users SET household_id = NULL WHERE id = ${auth.userID}
    `;
  }
);
