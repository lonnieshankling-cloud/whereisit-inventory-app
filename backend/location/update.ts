import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Location } from "./create";

interface UpdateLocationRequest {
  id: number;
  name: string;
}

// Updates a location's name.
export const update = api<UpdateLocationRequest, Location>(
  { expose: true, method: "PUT", path: "/locations/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("location not found");
    }

    const location = await db.queryRow<Location>`
      UPDATE locations
      SET name = ${req.name}
      WHERE id = ${req.id} AND household_id = ${user.household_id}
      RETURNING id, user_id as "userId", name, created_at as "createdAt"
    `;

    if (!location) {
      throw APIError.notFound("location not found");
    }

    return location;
  }
);
