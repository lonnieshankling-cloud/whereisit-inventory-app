import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface ExpiringItemsRequest {
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ExpiringItemsResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

export const expiring = api<ExpiringItemsRequest, ExpiringItemsResponse>(
  { expose: true, method: "GET", path: "/items/expiring", auth: true },
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
        AND expiration_date IS NOT NULL
        AND expiration_date <= NOW() + INTERVAL '7 days'
    `;

    const total = countResult?.count || 0;

    const items = await db.queryAll<Item>`
      SELECT
        id,
        user_id as "userId",
        location_id as "locationId",
        name,
        description,
        photo_url as "photoUrl",
        thumbnail_url as "thumbnailUrl",
        quantity,
        consumption,
        expiration_date as "expirationDate",
        tags,
        is_favorite as "isFavorite",
        created_at as "createdAt",
        last_confirmed_at as "lastConfirmedAt"
      FROM items
      WHERE household_id = ${user.household_id}
        AND expiration_date IS NOT NULL
        AND expiration_date <= NOW() + INTERVAL '7 days'
      ORDER BY expiration_date ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { items, total, hasMore: offset + items.length < total };
  }
);
