import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { itemPhotos } from "../storage";
import { generateAndUploadThumbnail } from "./thumbnailUtils";

interface UploadPhotoRequest {
  filename: string;
  contentType: string;
  data: string;
}

interface UploadPhotoResponse {
  url: string;
  thumbnailUrl: string;
}

export const uploadPhoto = api<UploadPhotoRequest, UploadPhotoResponse>(
  { expose: true, method: "POST", path: "/items/upload-photo", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const buffer = Buffer.from(req.data, "base64");
    
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}-${req.filename}`;

    await itemPhotos.upload(filename, buffer, {
      contentType: req.contentType,
    });

    const url = itemPhotos.publicUrl(filename);

    const thumbnailUrl = await generateAndUploadThumbnail(buffer, filename);

    return { url, thumbnailUrl };
  }
);
