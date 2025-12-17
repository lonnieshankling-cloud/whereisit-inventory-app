import { GoogleGenerativeAI } from '@google/generative-ai';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Camera, Check, ChevronDown, Crop, Edit2, Images, Loader, MapPin, Package, Plus, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Config } from '../config';
import { databaseService } from '../services/databaseService';
import { compressForDisplay } from '../services/imageCompression';
import {
  BoundingBox,
  createThumbnail,
  cropImageFromBoundingBox
} from '../services/imageViewerService';
import { AnimatedButton } from './AnimatedButton';
import { ImageCropModal } from './ImageCropModal';
import { ImageViewerModal } from './ImageViewerModal';

export interface DetectedItem {
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  extractedText?: string;
  confidence?: number;
  containerId?: string;
  containerName?: string;
  locationId?: string;
  locationName?: string;
  photoUri?: string;
  thumbnailUri?: string;    // Cropped thumbnail for list display
  boundingBox?: BoundingBox; // Crop coordinates from AI
  receiptUri?: string;
}

interface MobileShelfAnalyzerProps {
  visible: boolean;
  onClose: () => void;
  onItemsDetected: (items: DetectedItem[]) => void;
}

export function MobileShelfAnalyzer({ visible, onClose, onItemsDetected }: MobileShelfAnalyzerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [containers, setContainers] = useState<Array<{ id: string; name: string; location_id?: string | null }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [croppingItemIndex, setCroppingItemIndex] = useState<number | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | null>(null);
  const [pendingItemsForReceipt, setPendingItemsForReceipt] = useState<DetectedItem[]>([]);

  // Auto-request camera permission when modal opens
  useEffect(() => {
    if (visible && !permission?.granted && !permissionRequested) {
      setPermissionRequested(true);
      requestPermission();
    }
  }, [visible, permission, permissionRequested]);

  // Load containers and locations when review screen opens
  useEffect(() => {
    if (showReview) {
      loadContainersAndLocations();
    }
  }, [showReview]);

  const loadContainersAndLocations = useCallback(async () => {
    try {
      const [containersData, locationsData] = await Promise.all([
        databaseService.getAllContainers(),
        databaseService.getAllLocations(),
      ]);
      console.log('📦 Loaded containers:', containersData.length, containersData);
      console.log('📍 Loaded locations:', locationsData.length, locationsData);
      setContainers(containersData);
      setLocations(locationsData);
    } catch (error) {
      console.error('❌ Error loading containers/locations:', error);
    }
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (photo?.uri) {
        // Compress the image before analysis
        const compressedUri = await compressForDisplay(photo.uri);
        setCapturedPhoto(compressedUri);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const {
        launchImageLibraryAsync,
        requestMediaLibraryPermissionsAsync,
      } = await import('expo-image-picker');

      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to upload a photo for scanning.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings' },
          ]
        );
        return;
      }

      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const compressedUri = await compressForDisplay(result.assets[0].uri);
        setCapturedPhoto(compressedUri);
        setDetectedItems([]);
        setShowReview(false);
        setAnalysisStep('');
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to pick an image from your library.');
    }
  };

  const uploadImageToBackend = async (base64Image: string): Promise<string> => {
    try {
      setAnalysisStep('Uploading image...');
      
      const response = await fetch(`${Config.BACKEND_URL}/containers/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `shelf-${Date.now()}.jpg`,
          contentType: 'image/jpeg',
          data: base64Image,
        }),
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading to backend:', error);
      throw error;
    }
  };

  const analyzeWithBackendOCR = async (imageUrl: string): Promise<DetectedItem[]> => {
    try {
      setAnalysisStep('Analyzing with OCR...');
      
      const response = await fetch(`${Config.BACKEND_URL}/item/analyze-shelf-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) throw new Error(`OCR analysis failed: ${response.statusText}`);
      const data = await response.json();
      console.log('OCR found items:', data.items.length);
      console.log('Raw OCR text:', data.rawOcrText?.substring(0, 200));
      
      return data.items || [];
    } catch (error) {
      console.error('Error with OCR analysis:', error);
      return [];
    }
  };

  const enhanceWithGemini = async (base64Image: string, ocrItems: DetectedItem[]): Promise<DetectedItem[]> => {
    try {
      setAnalysisStep('Enhancing with Gemini AI...');
      
      const GEMINI_API_KEY = Config.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not found, skipping enhancement');
        return ocrItems;
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const ocrContext = ocrItems.length > 0 
        ? `\n\nOCR detected these items: ${ocrItems.map((item: DetectedItem) => 
            `${item.name}${item.brand ? ` (${item.brand})` : ''}${item.extractedText ? ` [Text: ${item.extractedText}]` : ''}`
          ).join(', ')}`
        : '';

      const prompt = `Analyze this shelf/storage image and provide detailed descriptions. ${ocrContext}\n\nFor each item, provide: name, description (brief, 5-10 words), brand (if visible), category (Beverage, Snack, Condiment, etc.).\n\nReturn as JSON array: [{"name": "...", "description": "...", "brand": "...", "category": "..."}]\n\nFocus on clearly visible items. Use OCR text as hints for brands/labels.`;

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
      ]);

      const textResponse = (await result.response).text();
      console.log('Gemini enhancement response:', textResponse.substring(0, 200));

      let jsonText = textResponse;
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const arrayMatch = textResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) jsonText = arrayMatch[0];
      }

      const geminiItems: DetectedItem[] = JSON.parse(jsonText);
      const mergedItems: DetectedItem[] = [];
      
      for (const geminiItem of geminiItems) {
        const ocrMatch = ocrItems.find((ocr: DetectedItem) => 
          ocr.name.toLowerCase().includes(geminiItem.name.toLowerCase()) ||
          geminiItem.name.toLowerCase().includes(ocr.name.toLowerCase())
        );

        mergedItems.push({
          name: geminiItem.name,
          description: geminiItem.description || ocrMatch?.extractedText,
          brand: geminiItem.brand || ocrMatch?.brand,
          category: geminiItem.category || ocrMatch?.category,
          extractedText: ocrMatch?.extractedText,
          confidence: ocrMatch?.confidence,
        });
      }

      for (const ocrItem of ocrItems) {
        const alreadyIncluded = mergedItems.some((item: DetectedItem) =>
          item.name.toLowerCase().includes(ocrItem.name.toLowerCase()) ||
          ocrItem.name.toLowerCase().includes(item.name.toLowerCase())
        );
        if (!alreadyIncluded) mergedItems.push(ocrItem);
      }

      return mergedItems;
    } catch (error) {
      console.error('Error enhancing with Gemini:', error);
      return ocrItems;
    }
  };

  const handleAnalyze = async () => {
    if (!capturedPhoto) return;

    setIsAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Convert image to base64
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Check if backend is available (not localhost)
      const isBackendAvailable = Config.BACKEND_URL && 
                                  !Config.BACKEND_URL.includes('localhost') &&
                                  !Config.BACKEND_URL.includes('127.0.0.1');

      let imageUrl: string | null = null;
      
      if (isBackendAvailable) {
        try {
          imageUrl = await uploadImageToBackend(base64Image);
          console.log('Image uploaded:', imageUrl);
        } catch (error) {
          console.warn('Backend upload failed, using Gemini only:', error);
        }
      } else {
        console.log('✨ Using Gemini AI for analysis (no backend needed)');
      }

      // If backend upload failed or wasn't attempted, use Gemini only
      if (!imageUrl) {
        setAnalysisStep('Analyzing with Gemini AI...');
        
        const geminiItems = await enhanceWithGemini(base64Image, []);
        
        if (geminiItems.length === 0) {
          Alert.alert('No Items Found', 'No items detected. Try another photo with better lighting.');
          setCapturedPhoto(null);
          setIsAnalyzing(false);
          setAnalysisStep('');
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDetectedItems(geminiItems);
        setShowReview(true);
        setIsAnalyzing(false);
        setAnalysisStep('');
        return;
      }

      const ocrItems = await analyzeWithBackendOCR(imageUrl);
      console.log('OCR found items:', ocrItems.length);

      const finalItems = await enhanceWithGemini(base64Image, ocrItems);
      
      if (finalItems.length === 0) {
        Alert.alert('No Items Found', 'No items detected. Try another photo with better lighting.');
        setCapturedPhoto(null);
        setIsAnalyzing(false);
        setAnalysisStep('');
        return;
      }

      console.log('Final enhanced items:', finalItems.length);
      
      // Attach the photo URI to all detected items
      const itemsWithPhoto = finalItems.map(item => ({
        ...item,
        photoUri: capturedPhoto,
      }));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDetectedItems(itemsWithPhoto);
      setShowReview(true);
    } catch (error) {
      console.error('Error analyzing shelf:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Analysis Failed', 
        `Failed to analyze the shelf.\n\nError: ${errorMessage}\n\nTry again or check backend connection.`
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedPhoto(null);
    setShowReview(false);
    setDetectedItems([]);
  };

  const handleCloseModal = () => {
    setCapturedPhoto(null);
    setIsAnalyzing(false);
    setAnalysisStep('');
    setShowReview(false);
    setDetectedItems([]);
    setPermissionRequested(false);
    onClose();
  };

  const handleEditItem = useCallback((index: number, field: keyof DetectedItem, value: string) => {
    setDetectedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleDeleteItem = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetectedItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCropPhoto = async (itemIndex: number) => {
    if (!capturedPhoto) return;
    
    try {
      setCroppingItemIndex(itemIndex);
      
      // Check if the item already has a cropped photo, otherwise use the original
      const sourceUri = detectedItems[itemIndex].photoUri || capturedPhoto;
      
      Alert.alert(
        'Edit Photo',
        'Choose an option:',
        [
          {
            text: 'Crop from Shelf',
            onPress: async () => {
              try {
                // Use custom crop modal with proper scaling
                setCropSourceUri(capturedPhoto);
                setShowCropModal(true);
              } catch (error) {
                console.error('Error opening crop modal:', error);
                Alert.alert('Error', 'Failed to open crop modal');
                setCroppingItemIndex(null);
              }
            },
          },
          {
            text: 'Select from Gallery',
            onPress: async () => {
              try {
                const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } = await import('expo-image-picker');
                
                // Request permission first
                const { status } = await requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Required', 'Please grant media library access to select photos.');
                  setCroppingItemIndex(null);
                  return;
                }
                
                const result = await launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  quality: 0.8,
                  aspect: [1, 1],
                });
                
                if (!result.canceled && result.assets[0]) {
                  const compressedUri = await compressForDisplay(result.assets[0].uri);
                  const updatedItems = [...detectedItems];
                  updatedItems[itemIndex] = {
                    ...updatedItems[itemIndex],
                    photoUri: compressedUri,
                  };
                  setDetectedItems(updatedItems);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } catch (error) {
                console.error('Error selecting from gallery:', error);
                Alert.alert('Error', 'Failed to select photo from gallery');
              } finally {
                setCroppingItemIndex(null);
              }
            },
          },
          {
            text: 'Use Shelf Photo',
            onPress: async () => {
              try {
                // Compress the shelf photo before using
                const compressedUri = await compressForDisplay(capturedPhoto);
                const updatedItems = [...detectedItems];
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  photoUri: compressedUri,
                };
                setDetectedItems(updatedItems);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                console.error('Error using shelf photo:', error);
                Alert.alert('Error', 'Failed to use shelf photo');
              } finally {
                setCroppingItemIndex(null);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setCroppingItemIndex(null),
          },
        ]
      );
    } catch (error) {
      console.error('Error with photo options:', error);
      Alert.alert('Error', 'Failed to open photo options');
      setCroppingItemIndex(null);
    }
  };

  const handleConfirmItems = () => {
    if (detectedItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item');
      return;
    }
    // Store items temporarily and show receipt prompt
    setPendingItemsForReceipt(detectedItems);
    setShowReceiptPrompt(true);
  };

  const handleSkipReceipt = () => {
    // User chose not to add receipt - proceed with items
    if (pendingItemsForReceipt.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onItemsDetected(pendingItemsForReceipt);
      onClose();
      handleResetState();
    }
  };

  const handleSaveReceiptAndItems = async () => {
    if (pendingItemsForReceipt.length === 0) return;

    try {
      // Attach receipt URI to all items if receipt was captured
      const itemsWithReceipt = receiptPhotoUri
        ? pendingItemsForReceipt.map(item => ({ ...item, receiptUri: receiptPhotoUri }))
        : pendingItemsForReceipt;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Pass items with receipt info to handler
      onItemsDetected(itemsWithReceipt);
      onClose();
      handleResetState();
    } catch (error) {
      console.error('Failed to process receipt:', error);
      Alert.alert('Error', 'Failed to process receipt. Proceeding with items.');
      onItemsDetected(pendingItemsForReceipt);
      onClose();
      handleResetState();
    }
  };

  const handleResetState = () => {
    setShowReview(false);
    setDetectedItems([]);
    setCapturedPhoto(null);
    setReceiptPhotoUri(null);
    setPendingItemsForReceipt([]);
    setShowReceiptPrompt(false);
    setShowReceiptCamera(false);
  };

  const handleCropComplete = async (croppedUri: string) => {
    if (croppingItemIndex !== null) {
      try {
        const compressedUri = await compressForDisplay(croppedUri);
        const updatedItems = [...detectedItems];
        updatedItems[croppingItemIndex] = {
          ...updatedItems[croppingItemIndex],
          photoUri: compressedUri,
        };
        setDetectedItems(updatedItems);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error processing cropped image:', error);
        Alert.alert('Error', 'Failed to process cropped image');
      }
    }
    setShowCropModal(false);
    setCropSourceUri(null);
    setCroppingItemIndex(null);
  };

  const handleReceiptPhotoTaken = async (uri: string) => {
    try {
      const compressedUri = await compressForDisplay(uri);
      setReceiptPhotoUri(compressedUri);
      setShowReceiptCamera(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to process receipt photo:', error);
      Alert.alert('Error', 'Failed to process receipt photo');
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shelf Analyzer</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.permissionContainer}>
            <Camera color="#111827" size={64} />
            <Text style={styles.permissionText}>Camera permission required</Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
            <X color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Shelf</Text>
          <View style={{ width: 40 }} />
        </View>

        {capturedPhoto ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedPhoto }} style={styles.preview} />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleRetake}
                disabled={isAnalyzing}
              >
                <Text style={styles.secondaryButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isAnalyzing && styles.buttonDisabled]}
                onPress={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <View style={styles.loadingContainer}>
                    <Loader color="#fff" size={20} />
                    <Text style={styles.buttonText}>{analysisStep || 'Analyzing...'}</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Analyze Items</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={styles.camera} facing="back">
              <View style={styles.cameraOverlay}>
                <View style={styles.scanGuide}>
                  <Text style={styles.guideText}>Position shelf in frame</Text>
                </View>
              </View>
            </CameraView>

            <View style={styles.controls}>
              <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <AnimatedButton
                style={[styles.uploadButton, isAnalyzing && styles.buttonDisabled]}
                onPress={handlePickFromGallery}
                disabled={isAnalyzing}
              >
                <Images color="#111827" size={18} />
                <Text style={styles.uploadButtonText}>Upload Photo</Text>
              </AnimatedButton>
              <Text style={styles.helperText}>Use a saved photo to scan</Text>
            </View>
          </>
        )}
      </View>

      {/* Review/Edit Screen Modal */}
      <Modal visible={showReview} animationType="slide">
        <View style={styles.reviewContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleRetake} style={styles.closeButton}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Review Items</Text>
              <Text style={styles.headerSubtitle}>{detectedItems.length} detected</Text>
            </View>
            <TouchableOpacity onPress={handleConfirmItems} style={styles.confirmButton}>
              <Check color="#10B981" size={24} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={detectedItems}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            contentContainerStyle={styles.reviewList}
            renderItem={({ item, index }) => (
              <ReviewItemCard
                item={item}
                index={index}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                containers={containers}
                locations={locations}
                croppingItemIndex={croppingItemIndex}
                onCropPhoto={handleCropPhoto}
                onLoadContainersAndLocations={loadContainersAndLocations}
              />
            )}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={100}
            initialNumToRender={5}
            windowSize={5}
          />

          <View style={styles.reviewFooter}>
            <TouchableOpacity 
              style={styles.retakeButton} 
              onPress={handleRetake}
            >
              <Camera color="#6B7280" size={20} />
              <Text style={styles.retakeButtonText}>Retake Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmAllButton} 
              onPress={handleConfirmItems}
            >
              <Check color="#fff" size={20} />
              <Text style={styles.confirmAllButtonText}>Add All Items</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Prompt Modal */}
      <Modal visible={showReceiptPrompt} animationType="fade" transparent={true}>
        <View style={styles.receiptPromptOverlay}>
          <View style={styles.receiptPromptModal}>
            <View style={styles.receiptPromptHeader}>
              <Text style={styles.receiptPromptTitle}>Add Receipt Photo?</Text>
              <Text style={styles.receiptPromptSubtitle}>
                Optional: Capture receipt for warranty/return reference
              </Text>
            </View>

            {receiptPhotoUri && (
              <View style={styles.receiptPreviewContainer}>
                <Image 
                  source={{ uri: receiptPhotoUri }} 
                  style={styles.receiptPreview}
                />
                <TouchableOpacity 
                  style={styles.changeReceiptButton}
                  onPress={() => setReceiptPhotoUri(null)}
                >
                  <Text style={styles.changeReceiptButtonText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.receiptPromptActions}>
              {!receiptPhotoUri ? (
                <>
                  <AnimatedButton
                    style={[styles.receiptActionButton, styles.receiptSkipButton]}
                    onPress={handleSkipReceipt}
                  >
                    <Text style={styles.receiptSkipButtonText}>Skip</Text>
                  </AnimatedButton>
                  <AnimatedButton
                    style={[styles.receiptActionButton, styles.receiptCaptureButton]}
                    onPress={() => {
                      setShowReceiptCamera(true);
                    }}
                  >
                    <Camera color="#fff" size={20} />
                    <Text style={styles.receiptCaptureButtonText}>Capture Photo</Text>
                  </AnimatedButton>
                </>
              ) : (
                <>
                  <AnimatedButton
                    style={[styles.receiptActionButton, styles.receiptSkipButton]}
                    onPress={handleSkipReceipt}
                  >
                    <Text style={styles.receiptSkipButtonText}>Skip Receipt</Text>
                  </AnimatedButton>
                  <AnimatedButton
                    style={[styles.receiptActionButton, styles.receiptConfirmButton]}
                    onPress={handleSaveReceiptAndItems}
                  >
                    <Check color="#fff" size={20} />
                    <Text style={styles.receiptConfirmButtonText}>Save & Continue</Text>
                  </AnimatedButton>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera Modal for Receipt Capture */}
      <Modal 
        visible={showReceiptCamera} 
        animationType="slide"
        transparent={false}
      >
        <View style={styles.receiptCameraContainer}>
          <TouchableOpacity 
            style={styles.receiptCameraClose}
            onPress={() => {
              setShowReceiptCamera(false);
            }}
          >
            <X color="#fff" size={28} />
          </TouchableOpacity>
          <CameraView 
            ref={cameraRef} 
            style={styles.receiptCamera}
            facing="back"
          >
            <View style={styles.receiptCameraOverlay}>
              <View style={styles.receiptScanGuide}>
                <Text style={styles.receiptGuideText}>Frame receipt in view</Text>
              </View>
            </View>
          </CameraView>
          <View style={styles.receiptCameraControls}>
            <TouchableOpacity 
              style={styles.receiptCaptureButtonLarge}
              onPress={async () => {
                if (!cameraRef.current) return;
                try {
                  const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                  });
                  await handleReceiptPhotoTaken(photo.uri);
                } catch (error) {
                  console.error('Failed to capture receipt:', error);
                  Alert.alert('Error', 'Failed to capture receipt photo');
                }
              }}
            >
              <View style={styles.receiptCaptureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Crop Modal */}
      {cropSourceUri && (
        <ImageCropModal
          visible={showCropModal}
          imageUri={cropSourceUri}
          onClose={() => {
            setShowCropModal(false);
            setCropSourceUri(null);
            setCroppingItemIndex(null);
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={[1, 1]}
        />
      )}
    </Modal>
  );
}

// Review Item Card Component - Memoized for performance
const ReviewItemCard = React.memo(function ReviewItemCard({ 
  item, 
  index, 
  onEdit, 
  onDelete,
  containers,
  locations,
  croppingItemIndex,
  onCropPhoto,
  onLoadContainersAndLocations,
}: { 
  item: DetectedItem; 
  index: number; 
  onEdit: (index: number, field: keyof DetectedItem, value: string) => void;
  onDelete: (index: number) => void;
  containers: Array<{ id: string; name: string; location_id?: string | null }>;
  locations: Array<{ id: string; name: string }>;
  croppingItemIndex: number | null;
  onCropPhoto: (index: number) => void;
  onLoadContainersAndLocations: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedBrand, setEditedBrand] = useState(item.brand || '');
  const [editedCategory, setEditedCategory] = useState(item.category || '');
  const [editedDescription, setEditedDescription] = useState(item.description || '');
  const [showContainerPicker, setShowContainerPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showCreateContainer, setShowCreateContainer] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(item.thumbnailUri || null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const filteredContainers = item.locationId
    ? containers.filter(container => container.location_id === item.locationId)
    : [];

  // Generate thumbnail on mount
  useEffect(() => {
    if (item.photoUri && !thumbnailUri && !isGeneratingThumbnail) {
      generateThumbnail();
    }
  }, [item.photoUri]);

  const generateThumbnail = async () => {
    if (!item.photoUri || isGeneratingThumbnail) return;
    
    setIsGeneratingThumbnail(true);
    try {
      let processedUri = item.photoUri;

      // If we have bounding box, crop to just the item
      if (item.boundingBox) {
        // Default image dimensions - adjust based on your camera settings
        const imageWidth = 1920;
        const imageHeight = 1440;
        
        try {
          processedUri = await cropImageFromBoundingBox(
            item.photoUri,
            item.boundingBox,
            imageWidth,
            imageHeight
          );
          console.log('[Thumbnail] Cropped from bounding box');
        } catch (error) {
          console.warn('[Thumbnail] Crop failed, using full photo:', error);
        }
      }

      // Create square thumbnail
      const thumb = await createThumbnail(processedUri, 100);
      setThumbnailUri(thumb);
      console.log('[Thumbnail] Generated successfully');
    } catch (error) {
      console.error('[Thumbnail] Generation failed:', error);
      // Fallback to full photo
      setThumbnailUri(item.photoUri);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleSave = () => {
    onEdit(index, 'name', editedName);
    onEdit(index, 'brand', editedBrand);
    onEdit(index, 'category', editedCategory);
    onEdit(index, 'description', editedDescription);
    setIsEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancel = () => {
    setEditedName(item.name);
    setEditedBrand(item.brand || '');
    setEditedCategory(item.category || '');
    setEditedDescription(item.description || '');
    setIsEditing(false);
  };

  const handleSelectContainer = (containerId: string, containerName: string) => {
    onEdit(index, 'containerId', containerId);
    onEdit(index, 'containerName', containerName);
    setShowContainerPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSelectLocation = (locationId: string, locationName: string) => {
    const locationChanged = locationId !== item.locationId;
    onEdit(index, 'locationId', locationId);
    onEdit(index, 'locationName', locationName);
    if (locationChanged) {
      onEdit(index, 'containerId', '');
      onEdit(index, 'containerName', '');
      setShowContainerPicker(false);
    }
    setShowLocationPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateContainer = async () => {
    if (!newContainerName.trim()) {
      Alert.alert('Error', 'Please enter a container name');
      return;
    }

    // Validate location is selected first
    if (!item.locationId) {
      Alert.alert(
        'Select Location First',
        'Please select a location before creating a container. Containers must belong to a location.'
      );
      return;
    }

    try {
      const containerId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await databaseService.createContainer({
        id: containerId,
        name: newContainerName.trim(),
        location_id: item.locationId,
        synced: 0,
      });

      // Reload containers and update state
      await onLoadContainersAndLocations();
      
      // Select the newly created container
      handleSelectContainer(containerId, newContainerName.trim());
      
      setNewContainerName('');
      setShowCreateContainer(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error creating container:', error);
      Alert.alert('Error', 'Failed to create container');
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    try {
      const locationId = `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🏗️ Creating location:', newLocationName.trim(), locationId);
      
      await databaseService.createLocation({
        id: locationId,
        name: newLocationName.trim(),
      });
      console.log('✅ Location created successfully');

      // Reload locations and update state
      console.log('🔄 Reloading locations...');
      await onLoadContainersAndLocations();
      console.log('✅ Locations reloaded');
      
      // Select the newly created location
      handleSelectLocation(locationId, newLocationName.trim());
      
      setNewLocationName('');
      setShowCreateLocation(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error creating location:', error);
      Alert.alert('Error', 'Failed to create location');
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove the photo from this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onEdit(index, 'photoUri', '');
            setThumbnailUri(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.reviewCard}>
        {/* NEW: Thumbnail + Item Info Layout */}
        <View style={styles.reviewCardRow}>
          {/* Thumbnail */}
          <TouchableOpacity 
            style={styles.thumbnailContainer}
            onPress={() => setViewingImageUri(item.photoUri || null)}
            activeOpacity={0.7}
          >
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Package color="#9CA3AF" size={40} />
              </View>
            )}
            {isGeneratingThumbnail && (
              <View style={styles.thumbnailOverlay}>
                <Loader color="#3B82F6" size={24} />
              </View>
            )}
          </TouchableOpacity>

          {/* Item Info */}
          <View style={styles.reviewCardInfoColumn}>
            <View style={styles.reviewCardHeader}>
              <View style={styles.itemNumberAndName}>
                <Text style={styles.reviewCardNumber}>#{index + 1}</Text>
                <Text style={styles.reviewItemName} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.reviewCardActions}>
                <TouchableOpacity 
                  onPress={() => onCropPhoto(index)} 
                  style={styles.iconButton}
                  disabled={croppingItemIndex === index}
                >
                  {croppingItemIndex === index ? (
                    <Loader color="#10B981" size={16} />
                  ) : (
                    <Crop color="#10B981" size={16} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.iconButton}>
                  <Edit2 color="#3B82F6" size={16} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(index)} style={styles.iconButton}>
                  <Trash2 color="#EF4444" size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Item Details */}
            <Text style={styles.reviewItemDetail} numberOfLines={1}>
              <Text style={styles.detailLabel}>Brand: </Text>
              {item.brand || '—'}
            </Text>
            <Text style={styles.reviewItemDetail} numberOfLines={1}>
              <Text style={styles.detailLabel}>Category: </Text>
              {item.category || '—'}
            </Text>
            <Text style={styles.reviewItemDetail} numberOfLines={2}>
              <Text style={styles.detailLabel}>Description: </Text>
              {item.description || '—'}
            </Text>
            {item.confidence !== undefined && (
              <Text style={styles.confidenceText}>
                Confidence: {(item.confidence * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Item name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand</Text>
              <TextInput
                style={styles.input}
                value={editedBrand}
                onChangeText={setEditedBrand}
                placeholder="Brand name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.input}
                value={editedCategory}
                onChangeText={setEditedCategory}
                placeholder="Category"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="Description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.reviewCardContent}>
            {/* Container Selection */}
            <View style={styles.selectionSection}>
              <TouchableOpacity 
                style={styles.selectionButton}
                onPress={() => {
                  if (!item.locationId) {
                    Alert.alert('Select Location First', 'Choose a location to see its containers.');
                    setShowLocationPicker(true);
                    return;
                  }
                  setShowContainerPicker(!showContainerPicker);
                }}
              >
                <Package color="#6B7280" size={16} />
                <Text style={styles.selectionButtonText} numberOfLines={1}>
                  {item.containerName || 'Select Container'}
                </Text>
                <ChevronDown color="#6B7280" size={16} />
              </TouchableOpacity>

              {showContainerPicker && (
                <View style={styles.pickerContent}>
                  {!item.locationId && (
                    <Text style={styles.helperText}>Select a location to view its containers.</Text>
                  )}

                  {item.locationId && filteredContainers.length > 0 && filteredContainers.map(container => (
                    <TouchableOpacity
                      key={container.id}
                      style={[
                        styles.pickerItem,
                        item.containerId === container.id && styles.pickerItemSelected
                      ]}
                      onPress={() => handleSelectContainer(container.id, container.name)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        item.containerId === container.id && styles.pickerItemTextSelected
                      ]}>
                        {container.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {item.locationId && filteredContainers.length === 0 && (
                    <Text style={styles.helperText}>No containers in this location yet.</Text>
                  )}

                  {item.locationId && (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        setShowContainerPicker(false);
                        setShowCreateContainer(true);
                      }}
                    >
                      <Plus color="#3B82F6" size={16} />
                      <Text style={styles.createText}>Create Container</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Location Selection */}
            <View style={styles.selectionSection}>
              <TouchableOpacity 
                style={styles.selectionButton}
                onPress={() => setShowLocationPicker(!showLocationPicker)}
              >
                <MapPin color="#6B7280" size={16} />
                <Text style={styles.selectionButtonText} numberOfLines={1}>
                  {item.locationName || 'Select Location'}
                </Text>
                <ChevronDown color="#6B7280" size={16} />
              </TouchableOpacity>

              {showLocationPicker && (
                <View style={styles.pickerContent}>
                  {locations.map(location => (
                    <TouchableOpacity
                      key={location.id}
                      style={[
                        styles.pickerItem,
                        item.locationId === location.id && styles.pickerItemSelected
                      ]}
                      onPress={() => handleSelectLocation(location.id, location.name)}
                      onLongPress={async () => {
                        Alert.alert(
                          'Delete Location',
                          `Are you sure you want to delete the location "${location.name}"? All items in this location will be unassigned.
This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await databaseService.unassignItemsFromLocation(location.id);
                                  await databaseService.deleteLocation(location.id);
                                  await onLoadContainersAndLocations();
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  Alert.alert('Location Deleted', 'The location and its assignments have been removed.');
                                } catch (error) {
                                  console.error('Failed to delete location:', error);
                                  Alert.alert('Error', 'Failed to delete location.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        item.locationId === location.id && styles.pickerItemTextSelected
                      ]}>
                        {location.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setShowLocationPicker(false);
                      setShowCreateLocation(true);
                    }}
                  >
                    <Plus color="#3B82F6" size={16} />
                    <Text style={styles.createText}>Create Location</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Create Container Modal */}
        <Modal visible={showCreateContainer} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Container</Text>
              <TextInput
                style={styles.input}
                placeholder="Container name"
                value={newContainerName}
                onChangeText={setNewContainerName}
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowCreateContainer(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleCreateContainer}
                >
                  <Text style={styles.saveButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Location Modal */}
        <Modal visible={showCreateLocation} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Location name"
                value={newLocationName}
                onChangeText={setNewLocationName}
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowCreateLocation(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleCreateLocation}
                >
                  <Text style={styles.saveButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={!!viewingImageUri}
        imageUri={viewingImageUri || ''}
        title={`${item.name} - Full Shelf Photo`}
        onClose={() => setViewingImageUri(null)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanGuide: {
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  guideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#22c55e',
  },
  uploadButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  helperText: {
    marginTop: 6,
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Review Screen Styles
  reviewContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  confirmButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewList: {
    padding: 16,
    paddingBottom: 100,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewCardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  reviewCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  reviewCardContent: {
    gap: 8,
  },
  reviewItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  reviewItemBrand: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  reviewItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  editForm: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reviewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmAllButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
    gap: 8,
  },
  confirmAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Photo Preview Styles
  photoPreviewContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    gap: 6,
  },
  removePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Container/Location Selection Styles
  locationSection: {
    marginTop: 12,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  // Picker Modal Styles
  pickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    flexShrink: 1,
  },
  emptyPicker: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Create New Button
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 8,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Create Modal Styles
  createModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  createModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  createModalBody: {
    padding: 20,
    gap: 16,
  },
  createInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  createModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  createCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  createCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  createConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  createConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Receipt Prompt Modal Styles
  receiptPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptPromptModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 420,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  receiptPromptHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  receiptPromptTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  receiptPromptSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  receiptPreviewContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  changeReceiptButton: {
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
  },
  changeReceiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  receiptPromptActions: {
    flexDirection: 'row',
    gap: 14,
  },
  receiptActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 54,
  },
  receiptSkipButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  receiptSkipButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  receiptCaptureButton: {
    backgroundColor: '#3B82F6',
  },
  receiptCaptureButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  receiptConfirmButton: {
    backgroundColor: '#10B981',
  },
  receiptConfirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  // Receipt Camera Styles
  receiptCameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    backgroundColor: '#000',
  },
  receiptCamera: {
    flex: 1,
  },
  receiptCameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  receiptScanGuide: {
    width: 280,
    height: 360,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  receiptGuideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  receiptCameraClose: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
  },
  receiptCameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCaptureButtonLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  receiptCaptureButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
  },
  // Thumbnail Viewer Styles
  reviewCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  thumbnail: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCardInfoColumn: {
    flex: 1,
  },
  itemNumberAndName: {
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewItemDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 4,
  },
  selectionSection: {
    marginBottom: 12,
    gap: 8,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  selectionButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  pickerItemSelected: {
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  pickerItemTextSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  createText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});

export default MobileShelfAnalyzer;
