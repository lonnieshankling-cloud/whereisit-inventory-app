import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface RecentItemsRequest {
  limit?: Query<number>;
  offset?: Query<number>;
}

interface RecentItemsResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

// Retrieves the 10 most recently added items.
export const recent = api<RecentItemsRequest, RecentItemsResponse>(
  { expose: true, method: "GET", path: "/items/recent", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const limit = req.limit || 50;
    const offset = req.offset || 0;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return { items: [], total: 0, hasMore: false };
    }

    const countResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM items
      WHERE household_id = ${user.household_id}
    `;

    const total = countResult?.count || 0;

    const items = await db.queryAll<Item>`
      SELECT
        i.id,
        i.name,
        i.created_at as "createdAt",
        i.description,
        i.thumbnail_url as "thumbnailUrl",
        i.photo_url as "photoUrl",
        i.quantity,
        i.tags,
        i.is_favorite as "isFavorite",
        i.last_confirmed_at as "lastConfirmedAt",
        l.name as "locationName",
        c.name as "containerName"
      FROM items i
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN containers c ON i.container_id = c.id
      WHERE i.household_id = ${user.household_id}
      ORDER BY i.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { items, total, hasMore: offset + items.length < total };
  }
);
