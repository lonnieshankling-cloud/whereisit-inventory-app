import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface BulkDeleteRequest {
  itemIds: number[];
}

export const bulkDelete = api<BulkDeleteRequest, void>(
  { expose: true, method: "POST", path: "/items/bulk-delete", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (req.itemIds.length === 0) {
      return;
    }

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return;
    }

    await db.exec`
      DELETE FROM items
      WHERE id = ANY(${req.itemIds}) AND household_id = ${user.household_id}
    `;
  }
);
