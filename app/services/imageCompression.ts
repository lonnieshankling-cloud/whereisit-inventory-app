import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

/**
 * Compresses an image to reduce file size while maintaining quality
 * @param uri - The original image URI
 * @param options - Compression options
 * @returns The URI of the compressed image
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
  } = options;

  try {
    // Get image info to determine if resizing is needed
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('Image compressed successfully:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('Failed to compress image:', error);
    // Return original URI if compression fails
    return uri;
  }
}

/**
 * Compresses an image for thumbnails (smaller size, lower quality)
 */
export async function compressForThumbnail(uri: string): Promise<string> {
  return compressImage(uri, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.6,
  });
}

/**
 * Compresses an image for full-size display (balanced quality and size)
 */
export async function compressForDisplay(uri: string): Promise<string> {
  return compressImage(uri, {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
  });
}
