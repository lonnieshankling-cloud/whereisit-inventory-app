import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { ItemReceipt } from "./add_receipt";

interface ListReceiptsRequest {
  itemId: number;
}

interface ListReceiptsResponse {
  receipts: ItemReceipt[];
}

export const listReceipts = api(
  { expose: true, method: "GET", path: "/item/:itemId/receipts", auth: true },
  async ({ itemId }: ListReceiptsRequest): Promise<ListReceiptsResponse> => {
    const authData = getAuthData()!;

    // Verify item exists and user has access
    const item = await db.queryRow`
      SELECT i.id, i.household_id
      FROM items i
      WHERE i.id = ${itemId}
    `;

    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user is member of household
    const member = await db.queryRow`
      SELECT id FROM household_members
      WHERE household_id = ${item.household_id}
      AND user_id = ${authData.userID}
    `;

    if (!member) {
      throw new Error("Access denied");
    }

    // Get all receipts for this item
    const receiptsQuery = db.query<ItemReceipt>`
      SELECT
        id,
        item_id as "itemId",
        receipt_url as "receiptUrl",
        thumbnail_url as "thumbnailUrl",
        receipt_type as "receiptType",
        description,
        extracted_date as "extractedDate",
        extracted_price as "extractedPrice",
        extracted_store as "extractedStore",
        uploaded_at as "uploadedAt",
        uploaded_by as "uploadedBy"
      FROM item_receipts
      WHERE item_id = ${itemId}
      ORDER BY uploaded_at DESC
    `;

    const receipts: ItemReceipt[] = [];
    for await (const receipt of receiptsQuery) {
      receipts.push(receipt);
    }

    return { receipts };
  }
);
