import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Household {
  id: number;
  name: string;
  owner_id: string | null;
  created_at: Date;
}

export interface GetHouseholdResponse {
  household: Household | null;
  current_user_id: string;
}

export const get = api(
  { method: "GET", path: "/household", expose: true, auth: true },
  async (): Promise<GetHouseholdResponse> => {
    const auth = getAuthData()!;

    const userResult = await db.queryRow`
      SELECT household_id FROM users WHERE id = ${auth.userID}
    `;

    if (!userResult || !userResult.household_id) {
      return { household: null, current_user_id: auth.userID };
    }

    const householdResult = await db.queryRow<Household>`
      SELECT id, name, owner_id, created_at FROM households WHERE id = ${userResult.household_id}
    `;

    return { household: householdResult, current_user_id: auth.userID };
  }
);
