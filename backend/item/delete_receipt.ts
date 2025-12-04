import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { itemReceipts } from "../storage";

interface DeleteReceiptRequest {
  receiptId: number;
}

interface DeleteReceiptResponse {
  success: boolean;
}

export const deleteReceipt = api(
  { expose: true, method: "DELETE", path: "/item/receipt/:receiptId", auth: true },
  async ({ receiptId }: DeleteReceiptRequest): Promise<DeleteReceiptResponse> => {
    const authData = getAuthData()!;

    // Get receipt with item and household info
    const receipt = await db.queryRow<{
      id: number;
      receipt_url: string;
      thumbnail_url: string;
      household_id: number;
    }>`
      SELECT
        r.id,
        r.receipt_url,
        r.thumbnail_url,
        i.household_id
      FROM item_receipts r
      JOIN items i ON r.item_id = i.id
      WHERE r.id = ${receiptId}
    `;

    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Verify user is member of household
    const member = await db.queryRow`
      SELECT id FROM household_members
      WHERE household_id = ${receipt.household_id}
      AND user_id = ${authData.userID}
    `;

    if (!member) {
      throw new Error("Access denied");
    }

    // Delete receipt from database
    await db.exec`
      DELETE FROM item_receipts
      WHERE id = ${receiptId}
    `;

    // Delete files from storage (optional - you may want to keep for audit trail)
    try {
      // Extract filename from URL (last part of path)
      const receiptPath = receipt.receipt_url.split('/').pop() || '';
      const thumbnailPath = receipt.thumbnail_url.split('/').pop() || '';
      
      await itemReceipts.remove(receiptPath);
      await itemReceipts.remove(thumbnailPath);
    } catch (error) {
      // Continue even if file deletion fails - files may have been manually deleted
    }

    return { success: true };
  }
);
