import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { ShoppingListItem } from "./list";
import { ensureUserHasHousehold } from "../household/utils";

interface UpdateShoppingRequest {
  id: number;
  isPurchased?: boolean;
  quantity?: number;
}

export const update = api<UpdateShoppingRequest, ShoppingListItem>(
  { expose: true, method: "PATCH", path: "/shopping/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const householdId = await ensureUserHasHousehold(userId);

    if (req.isPurchased === undefined && req.quantity === undefined) {
      throw APIError.invalidArgument("No fields to update");
    }

    let item: ShoppingListItem | null = null;

    if (req.isPurchased !== undefined && req.quantity !== undefined) {
      item = await db.queryRow<ShoppingListItem>`
        UPDATE shopping_list
        SET is_purchased = ${req.isPurchased}, quantity = ${req.quantity}, updated_at = NOW()
        WHERE id = ${req.id} AND household_id = ${householdId}
        RETURNING
          id,
          user_id as "userId",
          item_name as "itemName",
          quantity,
          added_at as "addedAt",
          is_purchased as "isPurchased",
          added_by_user_id as "addedByUserId",
          household_id as "householdId",
          updated_at as "updatedAt",
          added_by_user_id as "addedByEmail"
      `;
    } else if (req.isPurchased !== undefined) {
      item = await db.queryRow<ShoppingListItem>`
        UPDATE shopping_list
        SET is_purchased = ${req.isPurchased}, updated_at = NOW()
        WHERE id = ${req.id} AND household_id = ${householdId}
        RETURNING
          id,
          user_id as "userId",
          item_name as "itemName",
          quantity,
          added_at as "addedAt",
          is_purchased as "isPurchased",
          added_by_user_id as "addedByUserId",
          household_id as "householdId",
          updated_at as "updatedAt",
          added_by_user_id as "addedByEmail"
      `;
    } else if (req.quantity !== undefined) {
      item = await db.queryRow<ShoppingListItem>`
        UPDATE shopping_list
        SET quantity = ${req.quantity}, updated_at = NOW()
        WHERE id = ${req.id} AND household_id = ${householdId}
        RETURNING
          id,
          user_id as "userId",
          item_name as "itemName",
          quantity,
          added_at as "addedAt",
          is_purchased as "isPurchased",
          added_by_user_id as "addedByUserId",
          household_id as "householdId",
          updated_at as "updatedAt",
          added_by_user_id as "addedByEmail"
      `;
    }

    if (!item) {
      throw APIError.notFound("Shopping list item not found");
    }

    return item;
  }
);
