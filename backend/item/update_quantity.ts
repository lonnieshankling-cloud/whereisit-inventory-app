import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface UpdateQuantityRequest {
  id: number;
  quantity: number;
}

interface UpdateQuantityResponse {
  success: boolean;
  newQuantity: number;
}

// Updates just the quantity of an item quickly
export const updateQuantity = api<UpdateQuantityRequest, UpdateQuantityResponse>(
  { expose: true, method: "PATCH", path: "/items/:id/quantity", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("item not found");
    }

    if (req.quantity < 0) {
      throw APIError.invalidArgument("Quantity cannot be negative");
    }

    const result = await db.queryRow<{ quantity: number }>`
      UPDATE items
      SET quantity = ${req.quantity}
      WHERE id = ${req.id} AND household_id = ${user.household_id}
      RETURNING quantity
    `;

    if (!result) {
      throw APIError.notFound("item not found");
    }

    return {
      success: true,
      newQuantity: result.quantity,
    };
  }
);
