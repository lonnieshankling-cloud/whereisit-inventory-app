import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface SearchItemsRequest {
  query: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface SearchItemsResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

// Searches items by name, description, or tags.
export const search = api<SearchItemsRequest, SearchItemsResponse>(
  { expose: true, method: "GET", path: "/items/search", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const searchTerm = `%${req.query}%`;
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
        AND (
          name ILIKE ${searchTerm}
          OR description ILIKE ${searchTerm}
          OR EXISTS (
            SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE ${searchTerm}
          )
        )
    `;

    const total = countResult?.count || 0;

    const items = await db.queryAll<Item>`
      SELECT
        id,
        user_id as "userId",
        location_id as "locationId",
        container_id as "containerId",
        name,
        description,
        photo_url as "photoUrl",
        thumbnail_url as "thumbnailUrl",
        brand,
        color,
        size,
        quantity,
        consumption,
        expiration_date as "expirationDate",
        category,
        notes,
        tags,
        is_favorite as "isFavorite",
        created_at as "createdAt",
        last_confirmed_at as "lastConfirmedAt"
      FROM items
      WHERE household_id = ${user.household_id}
        AND (
          name ILIKE ${searchTerm}
          OR description ILIKE ${searchTerm}
          OR EXISTS (
            SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE ${searchTerm}
          )
        )
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { items, total, hasMore: offset + items.length < total };
  }
);
