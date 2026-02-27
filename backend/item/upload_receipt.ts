import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { itemReceipts } from "../storage";

interface UploadReceiptRequest {
  base64Image: string;
}

interface UploadReceiptResponse {
  receiptUrl: string;
  thumbnailUrl: string;
}

export const uploadReceipt = api(
  { expose: true, method: "POST", path: "/item/upload-receipt", auth: true },
  async ({ base64Image }: UploadReceiptRequest): Promise<UploadReceiptResponse> => {
    const authData = getAuthData()!;

    // Lazy-load sharp so native binding issues don't crash service startup.
    let sharp: any;
    try {
      const sharpModule = await import("sharp");
      sharp = sharpModule.default;
    } catch (error) {
      console.error("[uploadReceipt] Failed to load sharp:", error);
      throw APIError.unavailable("Image processing is temporarily unavailable");
    }

    // Remove data:image prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${authData.userID}-${timestamp}`;

    // Process main image: resize to max 1200px width, convert to WebP
    const processedImage = await sharp(buffer)
      .resize(1200, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Create thumbnail: 300x300, crop to fill
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Upload both images
    const receiptPath = `${filename}.webp`;
    const thumbnailPath = `${filename}-thumb.webp`;

    await itemReceipts.upload(receiptPath, processedImage);
    await itemReceipts.upload(thumbnailPath, thumbnail);

    const receiptUrl = await itemReceipts.publicUrl(receiptPath);
    const thumbnailUrl = await itemReceipts.publicUrl(thumbnailPath);

    return { receiptUrl, thumbnailUrl };
  }
);
