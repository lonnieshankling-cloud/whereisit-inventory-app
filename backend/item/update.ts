import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface UpdateItemRequest {
  id: number;
  name?: string;
  locationId?: number;
  containerId?: number | null;
  description?: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  quantity?: number;
  consumption?: number;
  expirationDate?: Date;
  tags?: string[];
  isFavorite?: boolean;
}

// Updates an item's properties.
export const update = api<UpdateItemRequest, Item>(
  { expose: true, method: "PUT", path: "/items/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("item not found");
    }

    const current = await db.queryRow<Item>`
      SELECT
        id,
        user_id as "userId",
        location_id as "locationId",
        container_id as "containerId",
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
      FROM items WHERE id = ${req.id} AND household_id = ${user.household_id}
    `;

    if (!current) {
      throw APIError.notFound("item not found");
    }

    const item = await db.queryRow<Item>`
      UPDATE items
      SET
        name = ${req.name ?? current.name},
        location_id = ${req.locationId !== undefined ? req.locationId : current.locationId},
        container_id = ${req.containerId !== undefined ? req.containerId : current.containerId},
        description = ${req.description !== undefined ? req.description : current.description},
        photo_url = ${req.photoUrl !== undefined ? req.photoUrl : current.photoUrl},
        thumbnail_url = ${req.thumbnailUrl !== undefined ? req.thumbnailUrl : current.thumbnailUrl},
        quantity = ${req.quantity ?? current.quantity},
        consumption = ${req.consumption ?? current.consumption},
        expiration_date = ${req.expirationDate !== undefined ? req.expirationDate : current.expirationDate},
        tags = ${req.tags ?? current.tags},
        is_favorite = ${req.isFavorite ?? current.isFavorite}
      WHERE id = ${req.id} AND household_id = ${user.household_id}
      RETURNING
        id,
        user_id as "userId",
        location_id as "locationId",
        container_id as "containerId",
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
    `;

    if (!item) {
      throw APIError.notFound("item not found");
    }

    return item;
  }
);
