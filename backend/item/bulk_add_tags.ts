import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface BulkAddTagsRequest {
  itemIds: number[];
  tags: string[];
}

interface BulkAddTagsResponse {
  count: number;
}

export const bulkAddTags = api<BulkAddTagsRequest, BulkAddTagsResponse>(
  { expose: true, method: "POST", path: "/items/bulk-add-tags", auth: true },
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

    const result = await db.queryRow<{ count: number }>`
      WITH updated AS (
        UPDATE items
        SET tags = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(tags || ${req.tags}::text[])
          )
        )
        WHERE id = ANY(${req.itemIds}) AND household_id = ${user.household_id}
        RETURNING id
      )
      SELECT COUNT(*) as count FROM updated
    `;

    return { count: result?.count ?? 0 };
  }
);
