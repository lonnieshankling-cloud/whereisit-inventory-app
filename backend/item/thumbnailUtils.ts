import { itemPhotos } from "../storage";

export async function generateAndUploadThumbnail(
  imageBuffer: Buffer,
  originalImageId: string
): Promise<string> {
  const thumbnailId = `${originalImageId}_thumb.jpg`;
  await itemPhotos.upload(thumbnailId, imageBuffer, {
    contentType: "image/jpeg",
  });
  
  return itemPhotos.publicUrl(thumbnailId);
}
