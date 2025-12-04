import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface RenameHouseholdRequest {
  name: string;
}

interface RenameHouseholdResponse {
  success: boolean;
}

export const rename = api<RenameHouseholdRequest, RenameHouseholdResponse>(
  { expose: true, method: "PUT", path: "/household/rename", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (!req.name || req.name.trim() === "") {
      throw APIError.invalidArgument("Household name cannot be empty");
    }

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("User is not part of a household");
    }

    const household = await db.queryRow<{ owner_id: string }>`
      SELECT owner_id FROM households WHERE id = ${user.household_id}
    `;

    if (!household) {
      throw APIError.notFound("Household not found");
    }

    if (household.owner_id !== userId) {
      throw APIError.permissionDenied("Only the household owner can rename the household");
    }

    await db.exec`
      UPDATE households
      SET name = ${req.name.trim()}
      WHERE id = ${user.household_id}
    `;

    return { success: true };
  }
);
