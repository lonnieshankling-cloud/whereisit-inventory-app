import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

interface DeleteShoppingRequest {
  id: number;
}

export const deleteItem = api<DeleteShoppingRequest, void>(
  { expose: true, method: "DELETE", path: "/shopping/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const householdId = await ensureUserHasHousehold(userId);

    await db.exec`
      DELETE FROM shopping_list
      WHERE id = ${req.id} AND household_id = ${householdId}
    `;
  }
);
