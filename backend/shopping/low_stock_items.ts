import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

export interface LowStockItem {
  id: number;
  name: string;
  quantity: number;
  minQuantity: number;
  stockStatus: "low" | "out";
  locationName: string | null;
}

interface LowStockItemsResponse {
  items: LowStockItem[];
}

export const lowStockItems = api<void, LowStockItemsResponse>(
  { expose: true, method: "GET", path: "/shopping/low-stock", auth: true },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const householdId = await ensureUserHasHousehold(userId);

    const items = await db.queryAll<LowStockItem>`
      SELECT
        i.id,
        i.name,
        i.quantity,
        i.min_quantity as "minQuantity",
        CASE
          WHEN i.quantity = 0 THEN 'out'
          ELSE 'low'
        END as "stockStatus",
        l.name as "locationName"
      FROM items i
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.household_id = ${householdId}
        AND i.min_quantity IS NOT NULL
        AND i.quantity <= i.min_quantity
      ORDER BY i.quantity ASC, i.name ASC
    `;

    return { items };
  }
);
