import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

export interface ShoppingListItem {
  id: number;
  userId: string;
  itemName: string;
  quantity: number;
  addedAt: Date;
  isPurchased: boolean;
  addedByUserId: string;
  addedByEmail: string;
  householdId: number;
  updatedAt: Date;
}

interface ListShoppingResponse {
  items: ShoppingListItem[];
}

export const list = api<void, ListShoppingResponse>(
  { expose: true, method: "GET", path: "/shopping", auth: true },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const householdId = await ensureUserHasHousehold(userId);

    const items = await db.queryAll<ShoppingListItem>`
      SELECT
        sl.id,
        sl.user_id as "userId",
        sl.item_name as "itemName",
        sl.quantity,
        sl.added_at as "addedAt",
        sl.is_purchased as "isPurchased",
        sl.added_by_user_id as "addedByUserId",
        sl.household_id as "householdId",
        sl.updated_at as "updatedAt",
        sl.added_by_user_id as "addedByEmail"
      FROM shopping_list sl
      WHERE sl.household_id = ${householdId}
      ORDER BY sl.is_purchased ASC, sl.added_at DESC
    `;

    return { items };
  }
);
