export async function applyHistogramEqualization(
  base64Image: string,
  contentType: string
): Promise<string> {
  try {
    const { default: sharp } = await import("sharp");
    
    const imageBuffer = Buffer.from(base64Image, "base64");

    const processedBuffer = await sharp(imageBuffer)
      .normalize()
      .toBuffer();

    const processedBase64 = processedBuffer.toString("base64");

    return processedBase64;
  } catch (error) {
    console.error("Failed to apply histogram equalization:", error);
    return base64Image;
  }
}
