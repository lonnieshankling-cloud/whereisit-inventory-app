import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Household } from "./get";

export interface CreateHouseholdRequest {
  name: string;
}

export const create = api(
  { method: "POST", path: "/household", expose: true, auth: true },
  async (req: CreateHouseholdRequest): Promise<Household> => {
    const auth = getAuthData()!;

    const userResult = await db.queryRow`
      SELECT household_id FROM users WHERE id = ${auth.userID}
    `;

    if (userResult && userResult.household_id) {
      throw new Error("User already has a household");
    }

    const household = await db.queryRow<Household>`
      INSERT INTO households (name, owner_id)
      VALUES (${req.name}, ${auth.userID})
      RETURNING id, name, owner_id, created_at
    `;

    if (!household) {
      throw new Error("Failed to create household");
    }

    await db.exec`
      INSERT INTO users (id, household_id)
      VALUES (${auth.userID}, ${household.id})
      ON CONFLICT (id) DO UPDATE SET household_id = ${household.id}
    `;

    return household;
  }
);
