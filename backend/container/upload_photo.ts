import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { containerPhotos } from "../storage";

interface UploadPhotoRequest {
  filename: string;
  contentType: string;
  data: string;
}

interface UploadPhotoResponse {
  url: string;
}

export const uploadPhoto = api<UploadPhotoRequest, UploadPhotoResponse>(
  { expose: true, method: "POST", path: "/containers/upload-photo", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const buffer = Buffer.from(req.data, "base64");
    
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}-${req.filename}`;

    await containerPhotos.upload(filename, buffer, {
      contentType: req.contentType,
    });

    const url = containerPhotos.publicUrl(filename);

    return { url };
  }
);
