import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface ListByPlacedStatusRequest {
  status: string;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListByPlacedStatusResponse {
  items: Item[];
  total: number;
  hasMore: boolean;
}

export const listByPlacedStatus = api<
  ListByPlacedStatusRequest,
  ListByPlacedStatusResponse
>(
  { expose: true, method: "GET", path: "/items/placed/:status", auth: true },
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

    const { status } = req;

    let items: Item[];
    let total = 0;

    if (status === "placed") {
      const countResult = await db.queryRow<{ count: number }>`
        SELECT COUNT(*) as count
        FROM items i
        WHERE i.household_id = ${user.household_id}
          AND (i.container_id IS NOT NULL OR i.location_id IS NOT NULL)
      `;
      total = countResult?.count || 0;

      items = await db.queryAll<Item>`
        SELECT
          i.id,
          i.name,
          i.description,
          i.photo_url as "photoUrl",
          i.thumbnail_url as "thumbnailUrl",
          i.quantity,
          i.tags,
          i.is_favorite as "isFavorite",
          i.category,
          i.location_id as "locationId",
          i.container_id as "containerId",
          i.expiration_date as "expirationDate",
          i.notes,
          c.name as "containerName",
          i.created_at as "createdAt",
          i.last_confirmed_at as "lastConfirmedAt",
          l.name as "locationName"
        FROM items i
        LEFT JOIN containers c ON i.container_id = c.id
        LEFT JOIN locations l ON i.location_id = l.id
        WHERE i.household_id = ${user.household_id}
          AND (i.container_id IS NOT NULL OR i.location_id IS NOT NULL)
        ORDER BY i.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else if (status === "not_placed") {
      const countResult = await db.queryRow<{ count: number }>`
        SELECT COUNT(*) as count
        FROM items i
        WHERE i.household_id = ${user.household_id}
          AND i.container_id IS NULL
          AND i.location_id IS NULL
      `;
      total = countResult?.count || 0;

      items = await db.queryAll<Item>`
        SELECT
          i.id,
          i.name,
          i.description,
          i.photo_url as "photoUrl",
          i.thumbnail_url as "thumbnailUrl",
          i.quantity,
          i.tags,
          i.is_favorite as "isFavorite",
          i.category,
          i.location_id as "locationId",
          i.container_id as "containerId",
          i.expiration_date as "expirationDate",
          i.notes,
          c.name as "containerName",
          i.created_at as "createdAt",
          i.last_confirmed_at as "lastConfirmedAt",
          l.name as "locationName"
        FROM items i
        LEFT JOIN containers c ON i.container_id = c.id
        LEFT JOIN locations l ON i.location_id = l.id
        WHERE i.household_id = ${user.household_id}
          AND i.container_id IS NULL
          AND i.location_id IS NULL
        ORDER BY i.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else {
      return { items: [], total: 0, hasMore: false };
    }

    return { items, total, hasMore: offset + items.length < total };
  }
);
