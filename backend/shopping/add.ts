import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { ShoppingListItem } from "./list";
import { ensureUserHasHousehold } from "../household/utils";

interface AddToShoppingRequest {
  itemName: string;
  quantity?: number;
}

export const add = api<AddToShoppingRequest, ShoppingListItem>(
  { expose: true, method: "POST", path: "/shopping", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const householdId = await ensureUserHasHousehold(userId);

    const item = await db.queryRow<ShoppingListItem>`
      INSERT INTO shopping_list (user_id, item_name, quantity, household_id, added_by_user_id)
      VALUES (${userId}, ${req.itemName}, ${req.quantity ?? 1}, ${householdId}, ${userId})
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

    if (!item) {
      throw new Error("Failed to add item to shopping list");
    }

    return item;
  }
);
