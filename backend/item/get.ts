import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface GetItemRequest {
  id: number;
}

// Retrieves a single item by ID.
export const get = api<GetItemRequest, Item>(
  { expose: true, method: "GET", path: "/items/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("item not found");
    }

    const item = await db.queryRow<Item>`
      SELECT
        i.id,
        i.user_id as "userId",
        i.location_id as "locationId",
        i.container_id as "containerId",
        i.name,
        i.description,
        i.photo_url as "photoUrl",
        i.thumbnail_url as "thumbnailUrl",
        i.brand,
        i.color,
        i.size,
        i.quantity,
        i.consumption,
        i.expiration_date as "expirationDate",
        i.category,
        i.notes,
        i.tags,
        i.is_favorite as "isFavorite",
        i.created_at as "createdAt",
        i.last_confirmed_at as "lastConfirmedAt",
        l.name as "locationName",
        c.name as "containerName"
      FROM items i
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN containers c ON i.container_id = c.id
      WHERE i.id = ${req.id} AND i.household_id = ${user.household_id}
    `;

    if (!item) {
      throw APIError.notFound("item not found");
    }

    return item;
  }
);
