import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface GetCategoryStatsByLocationRequest {
  locationId: string;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface GetCategoryStatsByLocationResponse {
  stats: CategoryStat[];
}

export const getCategoryStatsByLocation = api<
  GetCategoryStatsByLocationRequest,
  GetCategoryStatsByLocationResponse
>(
  { expose: true, method: "GET", path: "/items/stats/:locationId/categories", auth: true },
  async (req) => {
    const auth = getAuthData()!;

    const stats = await db.queryAll<CategoryStat>`
      SELECT COALESCE(category, 'Uncategorized') as category, COUNT(id) as count
      FROM items
      WHERE location_id = ${parseInt(req.locationId, 10)} AND user_id = ${auth.userID}
      GROUP BY category
      ORDER BY category ASC
    `;

    return { stats };
  }
);
