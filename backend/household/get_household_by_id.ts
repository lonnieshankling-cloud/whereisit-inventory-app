import { api } from "encore.dev/api";
import db from "../db";

export interface GetHouseholdByIdRequest {
  household_id: number;
}

export interface GetHouseholdByIdResponse {
  id: number;
  name: string;
  created_at: Date;
}

export const getHouseholdById = api(
  { method: "GET", path: "/household/:household_id", expose: true, auth: true },
  async (req: GetHouseholdByIdRequest): Promise<GetHouseholdByIdResponse> => {
    const household = await db.queryRow<GetHouseholdByIdResponse>`
      SELECT id, name, created_at FROM households WHERE id = ${req.household_id}
    `;

    if (!household) {
      throw new Error("Household not found");
    }

    return household;
  }
);
