// Forcing a rebuild
import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface GetConsumptionHistoryRequest {
  itemId: number;
}

export interface ConsumptionEntry {
  id: number;
  itemId: number;
  quantityRemaining: number;
  consumedQuantity: number;
  recordedAt: Date;
}

interface GetConsumptionHistoryResponse {
  history: ConsumptionEntry[];
  initialQuantity: number;
}

export const getConsumptionHistory = api<GetConsumptionHistoryRequest, GetConsumptionHistoryResponse>(
  { expose: true, method: "GET", path: "/items/:itemId/consumption-history", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("item not found");
    }

    const item = await db.queryRow<{ id: number; quantity: number; createdAt: Date }>`
      SELECT id, quantity, created_at as "createdAt"
      FROM items
      WHERE id = ${req.itemId} AND household_id = ${user.household_id}
    `;

    if (!item) {
      throw APIError.notFound("item not found");
    }

    const historyRows: ConsumptionEntry[] = [];
    for await (const row of db.query<ConsumptionEntry>`
      SELECT
        id,
        item_id as "itemId",
        quantity_remaining as "quantityRemaining",
        consumed_quantity as "consumedQuantity",
        recorded_at as "recordedAt"
      FROM consumption_history
      WHERE item_id = ${req.itemId}
      ORDER BY recorded_at ASC
    `) {
      historyRows.push(row);
    }

    const totalConsumed = historyRows.reduce((sum, entry) => sum + entry.consumedQuantity, 0);
    const initialQuantity = item.quantity + totalConsumed;

    return {
      history: historyRows,
      initialQuantity,
    };
  }
);
