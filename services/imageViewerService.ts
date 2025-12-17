/**
 * Image cropping and thumbnail utilities
 * Handles extracting bounding box crops from shelf photos
 */
import * as ImageManipulator from 'expo-image-manipulator';

export interface BoundingBox {
  x: number;      // Left edge (0-1 ratio)
  y: number;      // Top edge (0-1 ratio)
  width: number;  // Width (0-1 ratio)
  height: number; // Height (0-1 ratio)
}

/**
 * Crop an image based on bounding box coordinates
 * @param sourceUri - Original image URI
 * @param boundingBox - Normalized bounding box (0-1)
 * @param imageWidth - Original image width in pixels
 * @param imageHeight - Original image height in pixels
 * @returns URI of cropped image
 */
export async function cropImageFromBoundingBox(
  sourceUri: string,
  boundingBox: BoundingBox,
  imageWidth: number,
  imageHeight: number
): Promise<string> {
  try {
    // Validate inputs
    if (!sourceUri || boundingBox.width <= 0 || boundingBox.height <= 0) {
      console.warn('[Crop] Invalid parameters, returning original');
      return sourceUri;
    }

    // Convert normalized coordinates (0-1) to pixel coordinates
    const pixelLeft = Math.max(0, Math.round(boundingBox.x * imageWidth));
    const pixelTop = Math.max(0, Math.round(boundingBox.y * imageHeight));
    const pixelWidth = Math.min(
      imageWidth - pixelLeft,
      Math.round(boundingBox.width * imageWidth)
    );
    const pixelHeight = Math.min(
      imageHeight - pixelTop,
      Math.round(boundingBox.height * imageHeight)
    );

    if (pixelWidth <= 0 || pixelHeight <= 0) {
      console.warn('[Crop] Invalid crop dimensions, returning original');
      return sourceUri;
    }

    console.log(
      `[Crop] Cropping ${pixelLeft},${pixelTop} ${pixelWidth}x${pixelHeight} from ${imageWidth}x${imageHeight}`
    );

    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [
        {
          crop: {
            originX: pixelLeft,
            originY: pixelTop,
            width: pixelWidth,
            height: pixelHeight,
          },
        },
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[Crop] Success:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('[Crop] Failed:', error);
    // Return original if cropping fails
    return sourceUri;
  }
}

/**
 * Create a thumbnail from an image (small square crop)
 * Useful for list displays
 */
export async function createThumbnail(
  sourceUri: string,
  size: number = 100
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [
        {
          resize: {
            width: size,
            height: size,
          },
        },
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[Thumbnail] Created:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('[Thumbnail] Failed:', error);
    return sourceUri;
  }
}

/**
 * Compress and optimize an image for faster loading
 */
export async function compressImageForViewer(
  sourceUri: string
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.error('[Compress] Failed:', error);
    return sourceUri;
  }
}
