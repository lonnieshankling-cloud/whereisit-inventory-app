import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface LowStockItem {
  id: number;
  name: string;
  description: string | null;
  photoUrl: string | null;
  thumbnailUrl: string | null;
  quantity: number;
  locationId: number | null;
  locationName: string | null;
  tags: string[];
  expirationDate: Date | null;
  isFavorite: boolean;
  reorderPoint: number;
  averageDailyConsumption: number;
  daysUntilEmpty: number | null;
}

interface LowStockRequest {
  limit?: Query<number>;
  offset?: Query<number>;
}

interface LowStockResponse {
  items: LowStockItem[];
  total: number;
  hasMore: boolean;
}

export const lowStock = api<LowStockRequest, LowStockResponse>(
  { expose: true, method: "GET", path: "/items/low-stock", auth: true },
  async (req) => {
    const limit = req.limit || 50;
    const offset = req.offset || 0;
    try {
      const auth = getAuthData()!;
      const userId = auth.userID;

      const user = await db.queryRow<{ household_id: number | null }>`
        SELECT household_id FROM users WHERE id = ${userId}
      `;

      if (!user || !user.household_id) {
        return { items: [], total: 0, hasMore: false };
      }

      const lowStockItems: LowStockItem[] = [];

    for await (const item of db.query<{
      id: number;
      name: string;
      description: string | null;
      photoUrl: string | null;
      thumbnailUrl: string | null;
      quantity: number;
      locationId: number | null;
      locationName: string | null;
      tags: string[];
      expirationDate: Date | null;
      isFavorite: boolean;
    }>`
      SELECT
        i.id,
        i.name,
        i.description,
        i.photo_url as "photoUrl",
        i.thumbnail_url as "thumbnailUrl",
        i.quantity,
        i.location_id as "locationId",
        l.name as "locationName",
        i.tags,
        i.expiration_date as "expirationDate",
        i.is_favorite as "isFavorite"
      FROM items i
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.household_id = ${user.household_id}
      ORDER BY i.created_at DESC
    `) {
      const consumptionData = await db.query<{
        consumedQuantity: number;
        recordedAt: Date;
      }>`
        SELECT
          consumed_quantity as "consumedQuantity",
          recorded_at as "recordedAt"
        FROM consumption_history
        WHERE item_id = ${item.id}
        ORDER BY recorded_at ASC
      `;

      const consumptionRecords = [];
      for await (const record of consumptionData) {
        consumptionRecords.push(record);
      }

      if (consumptionRecords.length < 2) {
        continue;
      }

      const totalConsumed = consumptionRecords.reduce(
        (sum, record) => sum + record.consumedQuantity,
        0
      );

      const firstRecord = consumptionRecords[0].recordedAt;
      const lastRecord = consumptionRecords[consumptionRecords.length - 1].recordedAt;
      const daysBetween =
        (lastRecord.getTime() - firstRecord.getTime()) / (1000 * 60 * 60 * 24);

      if (daysBetween <= 0) {
        continue;
      }

      const averageDailyConsumption = totalConsumed / daysBetween;

      if (averageDailyConsumption <= 0) {
        continue;
      }

      const reorderLeadTime = 7;
      const reorderPoint = Math.ceil(averageDailyConsumption * reorderLeadTime);

      if (item.quantity <= reorderPoint) {
        const daysUntilEmpty =
          item.quantity > 0 ? Math.floor(item.quantity / averageDailyConsumption) : 0;

        lowStockItems.push({
          id: item.id,
          name: item.name,
          description: item.description,
          photoUrl: item.photoUrl,
          thumbnailUrl: item.thumbnailUrl,
          quantity: item.quantity,
          locationId: item.locationId,
          locationName: item.locationName,
          tags: item.tags,
          expirationDate: item.expirationDate,
          isFavorite: item.isFavorite,
          reorderPoint,
          averageDailyConsumption,
          daysUntilEmpty,
        });
      }
    }

      lowStockItems.sort((a, b) => {
        if (a.daysUntilEmpty === null) return 1;
        if (b.daysUntilEmpty === null) return -1;
        return a.daysUntilEmpty - b.daysUntilEmpty;
      });

      const total = lowStockItems.length;
      const paginatedItems = lowStockItems.slice(offset, offset + limit);

      return { 
        items: paginatedItems,
        total,
        hasMore: offset + paginatedItems.length < total
      };
    } catch (error) {
      console.error("Error in lowStock endpoint:", error);
      return { items: [], total: 0, hasMore: false };
    }
  }
);
