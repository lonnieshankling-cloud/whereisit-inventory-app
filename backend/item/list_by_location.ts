import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface ListItemsByLocationRequest {
  locationId: string;
}

interface ListItemsByLocationResponse {
  items: Item[];
}

export const listByLocation = api<
  ListItemsByLocationRequest,
  ListItemsByLocationResponse
>(
  { expose: true, method: "GET", path: "/items/location/:locationId", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return { items: [] };
    }

    const items = await db.queryAll<Item>`
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
        i.last_confirmed_at as "lastConfirmedAt",
        c.name as "containerName"
      FROM items i
      LEFT JOIN containers c ON i.container_id = c.id
      WHERE i.household_id = ${user.household_id}
        AND i.location_id = ${parseInt(req.locationId, 10)}
      ORDER BY i.created_at DESC
    `;

    return { items };
  }
);
