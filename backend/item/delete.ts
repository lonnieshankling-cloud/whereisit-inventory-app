import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface DeleteItemRequest {
  id: number;
}

// Deletes an item from the inventory.
export const deleteItem = api<DeleteItemRequest, void>(
  { expose: true, method: "DELETE", path: "/items/:id", auth: true },
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
      DELETE FROM items
      WHERE id = ${req.id} AND household_id = ${user.household_id}
    `;
  }
);
