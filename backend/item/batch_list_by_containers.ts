import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface BatchListByContainersRequest {
  containerIds: number[];
}

interface BatchListByContainersResponse {
  itemsByContainer: Record<number, Item[]>;
}

export const batchListByContainers = api<
  BatchListByContainersRequest,
  BatchListByContainersResponse
>(
  { expose: true, method: "POST", path: "/items/batch/containers", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (!req.containerIds || req.containerIds.length === 0) {
      return { itemsByContainer: {} };
    }

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return { itemsByContainer: {} };
    }

    const items = await db.queryAll<Item & { containerId: number }>`
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
        AND i.container_id = ANY(${req.containerIds})
      ORDER BY i.created_at DESC
    `;

    const itemsByContainer: Record<number, Item[]> = {};
    for (const containerId of req.containerIds) {
      itemsByContainer[containerId] = [];
    }

    for (const item of items) {
      if (item.containerId !== null) {
        if (!itemsByContainer[item.containerId]) {
          itemsByContainer[item.containerId] = [];
        }
        itemsByContainer[item.containerId].push(item);
      }
    }

    return { itemsByContainer };
  }
);
