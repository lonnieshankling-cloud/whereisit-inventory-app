import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import * as item from "./create";

interface BatchItem {
  name: string;
  description: string;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  expirationDate?: string | null;
  category?: string | null;
  notes?: string | null;
  containerId?: number | null;
}

interface BatchCreateRequest {
  items: BatchItem[];
  locationId?: number;
}

interface BatchCreateResponse {
  items: item.Item[];
}

export const batchCreate = api<BatchCreateRequest, BatchCreateResponse>(
  { expose: true, method: "POST", path: "/items/batch-create", auth: true },
  async (req) => {
    const auth = getAuthData()!;

    const createdItems = await Promise.all(
      req.items.map((batchItem) =>
        item.create({
          name: batchItem.name,
          description: batchItem.description,
          brand: batchItem.brand,
          color: batchItem.color,
          size: batchItem.size,
          quantity: batchItem.quantity,
          expirationDate: batchItem.expirationDate,
          category: batchItem.category,
          notes: batchItem.notes,
          locationId: req.locationId,
          containerId: batchItem.containerId,
        })
      )
    );

    return { items: createdItems };
  }
);
