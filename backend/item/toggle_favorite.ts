import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Item } from "./create";

interface ToggleFavoriteRequest {
  id: number;
}

// Toggles an item's favorite status.
export const toggleFavorite = api<ToggleFavoriteRequest, Item>(
  { expose: true, method: "POST", path: "/items/:id/favorite", auth: true },
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
      UPDATE items
      SET is_favorite = NOT is_favorite
      WHERE id = ${req.id} AND household_id = ${user.household_id}
      RETURNING
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
    `;

    if (!item) {
      throw APIError.notFound("item not found");
    }

    return item;
  }
);
