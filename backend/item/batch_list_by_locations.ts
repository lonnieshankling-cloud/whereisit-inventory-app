import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface BatchListByLocationsRequest {
  locationIds: number[];
}

interface BatchListByLocationsResponse {
  itemsByLocation: Record<number, Item[]>;
}

export const batchListByLocations = api<
  BatchListByLocationsRequest,
  BatchListByLocationsResponse
>(
  { expose: true, method: "POST", path: "/items/batch/locations", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (!req.locationIds || req.locationIds.length === 0) {
      return { itemsByLocation: {} };
    }

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return { itemsByLocation: {} };
    }

    const items = await db.queryAll<Item & { locationId: number }>`
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
        AND i.location_id = ANY(${req.locationIds})
      ORDER BY i.created_at DESC
    `;

    const itemsByLocation: Record<number, Item[]> = {};
    for (const locationId of req.locationIds) {
      itemsByLocation[locationId] = [];
    }

    for (const item of items) {
      if (item.locationId !== null) {
        if (!itemsByLocation[item.locationId]) {
          itemsByLocation[item.locationId] = [];
        }
        itemsByLocation[item.locationId].push(item);
      }
    }

    return { itemsByLocation };
  }
);
