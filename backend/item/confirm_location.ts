import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface ConfirmLocationRequest {
  id: number;
}

interface ConfirmLocationResponse {
  success: boolean;
  lastConfirmedAt: Date;
}

export const confirmLocation = api<ConfirmLocationRequest, ConfirmLocationResponse>(
  { expose: true, method: "POST", path: "/items/:id/confirm", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      throw APIError.notFound("item not found");
    }

    const result = await db.queryRow<{ lastConfirmedAt: Date }>`
      UPDATE items
      SET last_confirmed_at = NOW()
      WHERE id = ${req.id} AND household_id = ${user.household_id}
      RETURNING last_confirmed_at as "lastConfirmedAt"
    `;

    if (!result) {
      throw APIError.notFound("item not found");
    }

    return {
      success: true,
      lastConfirmedAt: result.lastConfirmedAt
    };
  }
);
