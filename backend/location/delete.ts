import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface DeleteLocationRequest {
  id: number;
}

// Deletes a location and unlinks associated items.
export const deleteLocation = api<DeleteLocationRequest, void>(
  { expose: true, method: "DELETE", path: "/locations/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return;
    }

    await db.exec`
      DELETE FROM locations
      WHERE id = ${req.id} AND household_id = ${user.household_id}
    `;
  }
);
