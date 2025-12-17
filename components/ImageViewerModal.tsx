/**
 * Full-screen image viewer - simplified version without reanimated
 * Uses basic React Native Animated API
 */
import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    Image as RNImage,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ImageViewerModalProps {
  visible: boolean;
  imageUri: string;
  title?: string;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ImageViewerModal({
  visible,
  imageUri,
  title,
  onClose,
}: ImageViewerModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fade in/out animation
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);



  // Get image dimensions for proper scaling
  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    console.log('[ImageViewer] Image loaded:', width, 'x', height);
    setImageSize({ width, height });
    setIsLoading(false);
  };

  // Calculate proper scaling to fit screen
  const getImageStyle = () => {
    if (!imageSize) {
      return {
        width: screenWidth,
        height: screenHeight * 0.7,
      };
    }

    const aspectRatio = imageSize.width / imageSize.height;
    const maxWidth = screenWidth * 0.95;
    const maxHeight = screenHeight * 0.8;

    let width = maxWidth;
    let height = maxWidth / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  };



  if (!visible) return null;

  const imageStyle = getImageStyle();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header with close button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeIcon}>
              <X color="#fff" size={28} />
            </View>
          </TouchableOpacity>
          {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          <View style={{ width: 44 }} />
        </View>

        {/* Image Container */}
        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={1}
          onPress={onClose}
        >
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}

          <RNImage
            source={{ uri: imageUri }}
            style={imageStyle}
            onLoad={handleImageLoad}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Help text */}
        <View style={styles.footer}>
          <Text style={styles.helpText}>Tap to close</Text>
        </View>
      </Animated.View>
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
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  closeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  helpText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
