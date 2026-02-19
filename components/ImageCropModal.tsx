/**
 * Image Crop Modal - properly scaled to fit phone screen
 * Allows users to crop images with a frame that fits within the image bounds
 */
import * as ImageManipulator from 'expo-image-manipulator';
import { Check, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    PanResponder,
    Image as RNImage,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onCropComplete: (croppedUri: string) => void;
  aspectRatio?: [number, number]; // e.g., [1, 1] for square, [4, 3] for landscape
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ImageCropModal({
  visible,
  imageUri,
  onClose,
  onCropComplete,
  aspectRatio = [1, 1],
}: ImageCropModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [scaledImageSize, setScaledImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropFrame, setCropFrame] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const cropStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const cropFrameRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const minCropSize = 60;

  // Get image dimensions for proper scaling
  useEffect(() => {
    if (visible && imageUri) {
      setIsLoading(true);
      RNImage.getSize(
        imageUri,
        (width, height) => {
          console.log('[ImageCrop] Original image size:', width, 'x', height);
          setImageSize({ width, height });
          
          // Calculate scaled image size to fit screen
          const scaledSize = calculateScaledImageSize(width, height);
          setScaledImageSize(scaledSize);
          
          // Initialize crop frame in center of scaled image
          const initialCropSize = calculateInitialCropSize(scaledSize, aspectRatio);
          setCropFrame({
            x: (scaledSize.width - initialCropSize.width) / 2,
            y: (scaledSize.height - initialCropSize.height) / 2,
            width: initialCropSize.width,
            height: initialCropSize.height,
          });
          
          setIsLoading(false);
        },
        (error) => {
          console.error('[ImageCrop] Failed to get image size:', error);
          setIsLoading(false);
        }
      );
    }
  }, [visible, imageUri]);

  const calculateScaledImageSize = (width: number, height: number) => {
    const maxWidth = screenWidth * 0.95;
    const maxHeight = screenHeight * 0.7; // Leave room for header/footer

    const aspectRatio = width / height;
    let scaledWidth = maxWidth;
    let scaledHeight = maxWidth / aspectRatio;

    if (scaledHeight > maxHeight) {
      scaledHeight = maxHeight;
      scaledWidth = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(scaledWidth),
      height: Math.round(scaledHeight),
    };
  };

  const calculateInitialCropSize = (
    scaledSize: { width: number; height: number },
    aspectRatio: [number, number]
  ) => {
    const cropAspectRatio = aspectRatio[0] / aspectRatio[1];
    
    // Start with 98% of the smaller dimension to allow full-size crops
    const maxSize = Math.min(scaledSize.width, scaledSize.height) * 0.98;
    
    let width = maxSize;
    let height = maxSize / cropAspectRatio;
    
    if (height > scaledSize.height * 0.7) {
      height = scaledSize.height * 0.7;
      width = height * cropAspectRatio;
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  };

  useEffect(() => {
    cropFrameRef.current = cropFrame;
  }, [cropFrame]);

  const clampCropFrame = (frame: { x: number; y: number; width: number; height: number }) => {
    if (!scaledImageSize) return frame;

    const clampedWidth = Math.max(minCropSize, Math.min(frame.width, scaledImageSize.width));
    const clampedHeight = Math.max(minCropSize, Math.min(frame.height, scaledImageSize.height));

    let x = Math.min(Math.max(frame.x, 0), scaledImageSize.width - clampedWidth);
    let y = Math.min(Math.max(frame.y, 0), scaledImageSize.height - clampedHeight);

    return {
      x,
      y,
      width: clampedWidth,
      height: clampedHeight,
    };
  };

  const cropPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (cropFrameRef.current) {
          cropStartRef.current = { ...cropFrameRef.current };
        }
      },
      onPanResponderMove: (_, gesture) => {
        if (!cropStartRef.current) return;
        const nextFrame = {
          x: cropStartRef.current.x + gesture.dx,
          y: cropStartRef.current.y + gesture.dy,
          width: cropStartRef.current.width,
          height: cropStartRef.current.height,
        };
        setCropFrame(clampCropFrame(nextFrame));
      },
      onPanResponderRelease: () => {
        cropStartRef.current = null;
      },
    })
  ).current;

  const createResizeResponder = (corner: 'tl' | 'br') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        if (cropFrameRef.current) {
          resizeStartRef.current = { ...cropFrameRef.current };
        }
      },
      onPanResponderMove: (_, gesture) => {
        if (!resizeStartRef.current || !scaledImageSize) return;

        const start = resizeStartRef.current;
        const ratio = aspectRatio[0] / aspectRatio[1];

        let width = start.width;
        let height = start.height;
        let x = start.x;
        let y = start.y;

        if (corner === 'br') {
          width = Math.max(minCropSize, start.width + gesture.dx);
          height = Math.round(width / ratio);

          if (x + width > scaledImageSize.width) {
            width = scaledImageSize.width - x;
            height = Math.round(width / ratio);
          }

          if (y + height > scaledImageSize.height) {
            height = scaledImageSize.height - y;
            width = Math.round(height * ratio);
          }
        } else {
          width = Math.max(minCropSize, start.width - gesture.dx);
          height = Math.round(width / ratio);

          x = start.x + (start.width - width);
          y = start.y + (start.height - height);

          if (x < 0) {
            x = 0;
            width = start.x + start.width;
            height = Math.round(width / ratio);
            y = start.y + (start.height - height);
          }

          if (y < 0) {
            y = 0;
            height = start.y + start.height;
            width = Math.round(height * ratio);
            x = start.x + (start.width - width);
          }
        }

        const nextFrame = clampCropFrame({ x, y, width, height });
        setCropFrame(nextFrame);
      },
      onPanResponderRelease: () => {
        resizeStartRef.current = null;
      },
    });

  const resizeTlResponder = useRef(createResizeResponder('tl')).current;
  const resizeBrResponder = useRef(createResizeResponder('br')).current;

  const handleCrop = async () => {
    if (!imageSize || !scaledImageSize || !cropFrame) {
      console.error('[ImageCrop] Missing required data for cropping');
      return;
    }

    try {
      setIsLoading(true);

      // Calculate scale factor between original and scaled image
      const scaleX = imageSize.width / scaledImageSize.width;
      const scaleY = imageSize.height / scaledImageSize.height;

      // Map crop frame coordinates from screen space to original image pixel space
      const cropInPixels = {
        originX: Math.round(cropFrame.x * scaleX),
        originY: Math.round(cropFrame.y * scaleY),
        width: Math.round(cropFrame.width * scaleX),
        height: Math.round(cropFrame.height * scaleY),
      };

      console.log('[ImageCrop] Cropping with:', cropInPixels);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: cropInPixels }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log('[ImageCrop] Crop successful:', result.uri);
      onCropComplete(result.uri);
      setIsLoading(false);
    } catch (error) {
      console.error('[ImageCrop] Crop failed:', error);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setImageSize(null);
    setScaledImageSize(null);
    setCropFrame(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
            <X color="#fff" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Crop Image</Text>
          <TouchableOpacity
            onPress={handleCrop}
            style={[styles.iconButton, isLoading && styles.disabled]}
            disabled={isLoading}
          >
            <Check color="#FACC15" size={28} />
          </TouchableOpacity>
        </View>

        {/* Image with crop frame */}
        <View style={styles.imageContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}

          {scaledImageSize && (
            <View style={styles.imageWrapper}>
              <RNImage
                source={{ uri: imageUri }}
                style={{
                  width: scaledImageSize.width,
                  height: scaledImageSize.height,
                }}
                resizeMode="contain"
              />

              {/* Crop frame overlay */}
              {cropFrame && (
                <View
                  style={[
                    styles.cropFrame,
                    {
                      left: cropFrame.x,
                      top: cropFrame.y,
                      width: cropFrame.width,
                      height: cropFrame.height,
                    },
                  ]}
                  {...cropPanResponder.panHandlers}
                >
                  <View style={styles.cropBorder} />
                  <View style={[styles.resizeHandle, styles.resizeHandleTopLeft]} {...resizeTlResponder.panHandlers} />
                  <View style={[styles.resizeHandle, styles.resizeHandleBottomRight]} {...resizeBrResponder.panHandlers} />
                </View>
              )}

              {/* Dimmed overlay outside crop frame */}
              {cropFrame && (
                <>
                  {/* Top */}
                  <View
                    style={[
                      styles.dimOverlay,
                      {
                        top: 0,
                        left: 0,
                        width: scaledImageSize.width,
                        height: cropFrame.y,
                      },
                    ]}
                    pointerEvents="none"
                  />
                  {/* Bottom */}
                  <View
                    style={[
                      styles.dimOverlay,
                      {
                        top: cropFrame.y + cropFrame.height,
                        left: 0,
                        width: scaledImageSize.width,
                        height: scaledImageSize.height - cropFrame.y - cropFrame.height,
                      },
                    ]}
                    pointerEvents="none"
                  />
                  {/* Left */}
                  <View
                    style={[
                      styles.dimOverlay,
                      {
                        top: cropFrame.y,
                        left: 0,
                        width: cropFrame.x,
                        height: cropFrame.height,
                      },
                    ]}
                    pointerEvents="none"
                  />
                  {/* Right */}
                  <View
                    style={[
                      styles.dimOverlay,
                      {
                        top: cropFrame.y,
                        left: cropFrame.x + cropFrame.width,
                        width: scaledImageSize.width - cropFrame.x - cropFrame.width,
                        height: cropFrame.height,
                      },
                    ]}
                    pointerEvents="none"
                  />
                </>
              )}
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.footer}>
          <Text style={styles.helpText}>Position the crop frame over the desired area</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FACC15',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  cropBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fff',
  },
  resizeHandle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FACC15',
    borderWidth: 2,
    borderColor: '#fff',
  },
  resizeHandleTopLeft: {
    top: -12,
    left: -12,
  },
  resizeHandleBottomRight: {
    bottom: -12,
    right: -12,
  },
  dimOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  helpText: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
  },
});
