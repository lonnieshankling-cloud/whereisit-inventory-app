import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface RecordConsumptionRequest {
  itemId: number;
  consumedQuantity: number;
}

interface RecordConsumptionResponse {
  success: boolean;
  newQuantity: number;
}

export const recordConsumption = api<RecordConsumptionRequest, RecordConsumptionResponse>(
  { expose: true, method: "POST", path: "/items/:itemId/consume", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("item not found");
    }

    const item = await db.queryRow<{ id: number; quantity: number }>`
      SELECT id, quantity
      FROM items
      WHERE id = ${req.itemId} AND household_id = ${user.household_id}
    `;

    if (!item) {
      throw APIError.notFound("item not found");
    }

    const newQuantity = Math.max(0, item.quantity - req.consumedQuantity);

    await db.exec`
      UPDATE items
      SET quantity = ${newQuantity}
      WHERE id = ${req.itemId}
    `;

    await db.exec`
      INSERT INTO consumption_history (item_id, quantity_remaining, consumed_quantity)
      VALUES (${req.itemId}, ${newQuantity}, ${req.consumedQuantity})
    `;

    return {
      success: true,
      newQuantity,
    };
  }
);
