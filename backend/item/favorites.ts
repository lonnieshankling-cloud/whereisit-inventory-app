import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface FavoriteItemsRequest {
  limit?: Query<number>;
  offset?: Query<number>;
}

interface FavoriteItemsResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

// Retrieves all favorite items.
export const favorites = api<FavoriteItemsRequest, FavoriteItemsResponse>(
  { expose: true, method: "GET", path: "/items/favorites", auth: true },
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
      WHERE household_id = ${user.household_id} AND is_favorite = TRUE
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
      WHERE household_id = ${user.household_id} AND is_favorite = TRUE
      ORDER BY name ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { items, total, hasMore: offset + items.length < total };
  }
);
