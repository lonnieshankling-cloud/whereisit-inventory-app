import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface BulkUpdateLocationRequest {
  itemIds: number[];
  locationId: number;
  containerId?: number | null;
}

interface BulkUpdateLocationResponse {
  count: number;
}

export const bulkUpdateLocation = api<BulkUpdateLocationRequest, BulkUpdateLocationResponse>(
  { expose: true, method: "POST", path: "/items/bulk-update-location", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (req.itemIds.length === 0) {
      return { count: 0 };
    }

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return { count: 0 };
    }

    const containerId = req.containerId === undefined ? null : req.containerId;

    const result = await db.queryRow<{ count: number }>`
      WITH updated AS (
        UPDATE items
        SET location_id = ${req.locationId}, container_id = ${containerId}
        WHERE id = ANY(${req.itemIds}) AND household_id = ${user.household_id}
        RETURNING id
      )
      SELECT COUNT(*) as count FROM updated
    `;

    return { count: result?.count ?? 0 };
  }
);
