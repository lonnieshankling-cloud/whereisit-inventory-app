import imageCompression from "browser-image-compression";
import { enhanceImageForLowLight } from "./imageQuality";

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxWidthOrHeight: 1920,
    initialQuality: 0.7,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

export async function compressBase64Image(
  base64String: string,
  options?: { enhanceLowLight?: boolean }
): Promise<string> {
  let imageData = base64String;

  if (options?.enhanceLowLight) {
    imageData = await enhanceImageForLowLight(imageData);
  }

  const base64Response = await fetch(imageData);
  const blob = await base64Response.blob();

  const file = new File([blob], "image.jpg", { type: blob.type });

  const compressedFile = await compressImage(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedFile);
  });
}
