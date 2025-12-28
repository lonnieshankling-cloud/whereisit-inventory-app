import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

// Cache for compressed images to avoid recompressing
const compressionCache = new Map<string, string>();

// Clear cache when it gets too large (prevent memory issues)
function manageCacheSize() {
  if (compressionCache.size > 50) {
    const firstKey = compressionCache.keys().next().value;
    if (firstKey) compressionCache.delete(firstKey);
  }
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

  // Check cache first
  const cacheKey = `${uri}-${maxWidth}-${maxHeight}-${quality}`;
  if (compressionCache.has(cacheKey)) {
    console.log('Using cached compressed image');
    return compressionCache.get(cacheKey)!;
  }

  try {
    manageCacheSize();
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
    
    // Cache the result
    compressionCache.set(cacheKey, result.uri);
    
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

/**
 * Compresses an image specifically for barcode detection.
 * Higher quality and slightly larger dimensions help Vision lock onto bars.
 */
export async function compressForBarcode(uri: string): Promise<string> {
  return compressImage(uri, {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 1.0,
  });
}
