import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface AddReceiptRequest {
  itemId: number;
  receiptUrl: string;
  thumbnailUrl: string;
  receiptType: "purchase" | "warranty" | "repair" | "upgrade";
  description?: string;
  extractedDate?: string;
  extractedPrice?: number;
  extractedStore?: string;
}

export interface ItemReceipt {
  id: number;
  itemId: number;
  receiptUrl: string;
  thumbnailUrl: string;
  receiptType: string;
  description: string | null;
  extractedDate: string | null;
  extractedPrice: number | null;
  extractedStore: string | null;
  uploadedAt: Date;
  uploadedBy: string;
}

export const addReceipt = api(
  { expose: true, method: "POST", path: "/item/add-receipt", auth: true },
  async ({
    itemId,
    receiptUrl,
    thumbnailUrl,
    receiptType,
    description,
    extractedDate,
    extractedPrice,
    extractedStore,
  }: AddReceiptRequest): Promise<ItemReceipt> => {
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

    // Insert receipt
    const receipt = await db.queryRow<ItemReceipt>`
      INSERT INTO item_receipts (
        item_id,
        receipt_url,
        thumbnail_url,
        receipt_type,
        description,
        extracted_date,
        extracted_price,
        extracted_store,
        uploaded_by
      )
      VALUES (
        ${itemId},
        ${receiptUrl},
        ${thumbnailUrl},
        ${receiptType},
        ${description || null},
        ${extractedDate || null},
        ${extractedPrice || null},
        ${extractedStore || null},
        ${authData.userID}
      )
      RETURNING
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
    `;

    if (!receipt) {
      throw new Error("Failed to add receipt");
    }

    return receipt;
  }
);
