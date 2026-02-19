import { logBarcodeScanned, logItemAdded, logPhotoTaken } from '@/utils/analytics';
import { canAddItem, ENTITLEMENT_ID, FREE_ITEM_LIMIT, getRemainingItems, refreshPremiumStatus } from '@/utils/premium';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Barcode, Calendar, Camera, Package, Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { MobileBarcodeScannerModal } from '../../components/MobileBarcodeScannerModal';
import { MobileCamera } from '../../components/MobileCamera';
import { DetectedItem, MobileShelfAnalyzer } from '../../components/MobileShelfAnalyzer';
import { itemApi } from '../../services/api';
import { databaseService } from '../../services/databaseService';
import PaywallScreen from './PaywallScreen';

interface AddItemScreenProps {
  onClose?: () => void;
  onItemAdded?: () => void;
  initialLocationId?: string;
  initialContainerId?: string;
  initialContainerName?: string;
}

export default function AddItemScreen({ onClose, onItemAdded, initialLocationId, initialContainerId, initialContainerName }: AddItemScreenProps = {}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [minQuantity, setMinQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseStore, setPurchaseStore] = useState('');
  const [warrantyDate, setWarrantyDate] = useState<Date | null>(null);
  const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(initialContainerId || null);
  const [containerName, setContainerName] = useState<string>(initialContainerName || '');
  const [locationId, setLocationId] = useState<string | null>(initialLocationId || null);
  const [locationName, setLocationName] = useState<string>('');
  
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [showShelfAnalyzer, setShowShelfAnalyzer] = useState(false);
  const [showContainerPicker, setShowContainerPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCreateContainer, setShowCreateContainer] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');
  const [containers, setContainers] = useState<Array<{id: string; name: string; location_id?: string | null}>>([]);
  const [locations, setLocations] = useState<Array<{id: string; name: string}>>([]);
  const [isSaving, setIsSaving] = useState(false);

  const filteredContainers = locationId
    ? containers.filter(c => c.location_id === locationId)
    : [];

  const handleDetectedItems = (items: DetectedItem[]) => {
    if (!items?.length) {
      Alert.alert('No items found', 'Try another photo with better lighting.');
      setShowShelfAnalyzer(false);
      return;
    }

    const first = items[0];
    if (first.name) setName(first.name);
    if (first.description) setDescription(first.description);
    if (first.photoUri) setImageUri(first.photoUri);
    if (first.containerId) setContainerId(first.containerId);
    if (first.containerName) setContainerName(first.containerName);
    if (first.locationId) setLocationId(first.locationId);
    if (first.locationName) setLocationName(first.locationName);

    setShowShelfAnalyzer(false);
    Alert.alert(
      'Analysis complete',
      'Fields have been pre-filled from the photo. Save now or review/edit first?',
      [
        { text: 'Review first', style: 'cancel' },
        {
          text: 'Save now',
          onPress: () => {
            // Give React state a tick to settle before saving
            setTimeout(() => {
              handleSave();
            }, 50);
          },
        },
      ]
    );
  };

  useEffect(() => {
    // Prefill when opening with a specific container/location
    if (initialContainerId !== undefined) {
      setContainerId(initialContainerId || null);
    }
    if (initialContainerName !== undefined) {
      setContainerName(initialContainerName || '');
    }
    if (initialLocationId !== undefined) {
      setLocationId(initialLocationId || null);
      // Set location name from loaded locations
      const location = locations.find(loc => loc.id === initialLocationId);
      if (location) {
        setLocationName(location.name);
      }
    }
  }, [initialContainerId, initialContainerName, initialLocationId, locations]);

  useEffect(() => {
    // Initialize database service and load containers and locations
    const init = async () => {
      try {
        await databaseService.initialize();
        const allContainers = await databaseService.getAllContainers();
        setContainers(allContainers.map(c => ({ id: c.id, name: c.name, location_id: c.location_id })));
        
        const allLocations = await databaseService.getAllLocations();
        setLocations(allLocations);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    init();
  }, []);

  const handleBarcodeScanned = async (scannedBarcode: string, type: string) => {
    console.log(`Barcode scanned: ${scannedBarcode} (Type: ${type})`);
    setBarcode(scannedBarcode);
    setShowBarcodeScanner(false);
    
    // Track barcode scan
    await logBarcodeScanned(type, true);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Check if item exists locally
    try {
      const existingItems = await databaseService.searchItemsByBarcode(scannedBarcode);
      if (existingItems.length > 0) {
        Alert.alert(
          'Item Found',
          `Found ${existingItems.length} item(s) with this barcode in your inventory.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error searching for existing items:', error);
    }

    // Try to look up item details from backend
    try {
      const details = await itemApi.lookup(scannedBarcode);
      if (details && details.name) {
        setName(details.name);
        if (details.description) setDescription(details.description);
        // If we got an image URL and don't have one yet, use it
        if (details.imageUrl && !imageUri) {
             setImageUri(details.imageUrl);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.log('Barcode lookup failed:', error);
      // Fail silently, just user has to enter data
    }
  };

  const handleImageCaptured = async (uri: string) => {
    setImageUri(uri);
    setShowCamera(false);
    
    // Track photo taken
    await logPhotoTaken('camera');
  };

  const handleReceiptPhotoTaken = async (uri: string) => {
    setReceiptUri(uri);
    setShowReceiptCamera(false);
    
    // Track photo taken
    await logPhotoTaken('camera');
  };

  const handleWarrantyDateChange = (event: any, selectedDate?: Date) => {
    setShowWarrantyPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setWarrantyDate(selectedDate);
    }
  };

  const handleCreateContainer = async () => {
    if (!locationId) {
      Alert.alert('Error', 'Please select a location first');
      return;
    }

    if (!newContainerName.trim()) {
      Alert.alert('Error', 'Please enter a container name');
      return;
    }

    try {
      const containerId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await databaseService.createContainer({
        id: containerId,
        name: newContainerName.trim(),
        location_id: locationId,
        synced: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reload containers
      const allContainers = await databaseService.getAllContainers();
      setContainers(allContainers.map(c => ({ id: c.id, name: c.name, location_id: c.location_id })));
      
      // Select the newly created container
      setContainerId(containerId);
      setContainerName(newContainerName.trim());
      
      // Close modal and reset
      setShowCreateContainer(false);
      setNewContainerName('');
      
      Alert.alert('Success', 'Container created!');
    } catch (error) {
      console.error('Failed to create container:', error);
      Alert.alert('Error', 'Failed to create container');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    // Check premium status and item limit
    try {
      await databaseService.initialize();
      await refreshPremiumStatus();
      const currentItems = await databaseService.getAllItems();
      const canAdd = await canAddItem(currentItems.length);
      
      if (!canAdd) {
        // Show paywall when limit reached
        const remaining = await getRemainingItems(currentItems.length);
        Alert.alert(
          'Item Limit Reached',
          `You've reached the free limit of ${FREE_ITEM_LIMIT} items. Upgrade to Premium to add unlimited items!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => setShowPaywall(true) },
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Failed to check item limit:', error);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      // Ensure database is initialized
      await databaseService.initialize();
      
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newItem = {
        id: itemId,
        name: name.trim(),
        description: description.trim() || undefined,
        location_id: locationId || undefined,
        container_id: containerId || undefined,
        barcode: barcode || undefined,
        quantity: parseInt(quantity) || 1,
        min_quantity: minQuantity ? parseInt(minQuantity) : undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchase_store: purchaseStore.trim() || undefined,
        warranty_date: warrantyDate ? warrantyDate.toISOString() : undefined,
        local_photo_uri: imageUri || undefined,
        photo_url: undefined,
        synced: 0,
      };

      console.log('Saving item to database:', newItem);
      
      // Save to local database
      await databaseService.createItem(newItem);
      
      // Save receipt photo if provided
      if (receiptUri) {
        const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await databaseService.createReceipt({
          id: receiptId,
          item_id: itemId,
          local_photo_uri: receiptUri,
          synced: 0,
        });
        console.log('Receipt saved successfully!');
      }
      
      // Track item added with analytics
      await logItemAdded(undefined, !!imageUri);
      
      console.log('Item saved successfully!');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Success',
        'Item saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Calling onItemAdded and onClose');
              onItemAdded?.();
              onClose?.();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save item:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Failed to save item: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyzePress = async () => {
    try {
      const latestStatus = await refreshPremiumStatus();
      if (latestStatus.active) {
        setShowShelfAnalyzer(true);
        return;
      }

      // Validate 'pro' entitlement (Must match the "Identifier" in your RevenueCat Entitlements)
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });

      if (
        paywallResult === PAYWALL_RESULT.NOT_PRESENTED ||
        paywallResult === PAYWALL_RESULT.PURCHASED ||
        paywallResult === PAYWALL_RESULT.RESTORED
      ) {
        setShowShelfAnalyzer(true);
      } else {
        console.log('Paywall declined or cancelled');
      }
    } catch (error) {
      console.error('Paywall error:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item</Text>
        <View style={{ width: 40 }} />
      </View>



      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Image Section */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.itemImage} />
              <TouchableOpacity
                onPress={() => setImageUri(null)}
                style={styles.removeImageButton}
              >
                <X color="white" size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowCamera(true)}
              style={styles.addImageButton}
            >
              <Camera color="#FACC15" size={32} />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleAnalyzePress}
            style={styles.analyzeButton}
          >
            <Text style={styles.analyzeButtonText}>Analyze photo (AI)</Text>
          </TouchableOpacity>
        </View>

        {/* Receipt Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Receipt Photo (Optional)</Text>
          <Text style={styles.sectionSubtitle}>Store warranty & purchase information</Text>
          {receiptUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: receiptUri }} style={styles.itemImage} />
              <TouchableOpacity
                onPress={() => setReceiptUri(null)}
                style={styles.removeImageButton}
              >
                <X color="white" size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowReceiptCamera(true)}
              style={styles.addImageButton}
            >
              <Camera color="#3B82F6" size={32} />
              <Text style={styles.addImageText}>Add Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter item name"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Description Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description"
            style={[styles.input, styles.textArea]}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Barcode Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Barcode</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Scan or enter barcode"
              style={[styles.input, { flex: 1 }]}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={() => setShowBarcodeScanner(true)}
              style={styles.scanButton}
            >
              <Barcode color="white" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        {/* Minimum Quantity Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Minimum Quantity (Low Stock Alert)</Text>
          <TextInput
            value={minQuantity}
            onChangeText={setMinQuantity}
            placeholder="Leave empty to disable alerts"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>Get notified when stock falls below this amount</Text>
        </View>

        {/* Purchase Info Section */}
        <Text style={styles.sectionTitle}>Purchase Information</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Price</Text>
          <TextInput
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            placeholder="0.00"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Store</Text>
          <TextInput
            value={purchaseStore}
            onChangeText={setPurchaseStore}
            placeholder="Where did you buy this?"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Warranty Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Warranty Expiry</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowWarrantyPicker(true)}
          >
            <Calendar color="#6B7280" size={20} />
            <Text style={[styles.datePickerText, !warrantyDate && styles.containerPickerPlaceholder]}>
              {warrantyDate ? warrantyDate.toLocaleDateString() : 'Select Expiry Date'}
            </Text>
          </TouchableOpacity>
          
          {showWarrantyPicker && (
            <DateTimePicker
              value={warrantyDate || new Date()}
              mode="date"
              display="default"
              onChange={handleWarrantyDateChange}
              minimumDate={new Date()}
            />
          )}

           {warrantyDate && Platform.OS === 'ios' && showWarrantyPicker && (
            <TouchableOpacity
                style={styles.closeDatePickerButton}
                onPress={() => setShowWarrantyPicker(false)}
            >
                <Text style={styles.closeDatePickerText}>Done</Text>
            </TouchableOpacity>
           )}

           {warrantyDate && (
             <TouchableOpacity
               style={styles.clearContainerButton}
               onPress={() => setWarrantyDate(null)}
             >
               <Text style={styles.clearContainerText}>Clear</Text>
             </TouchableOpacity>
           )}
        </View>

        {/* Location Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity
            style={styles.containerPicker}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={locationName ? styles.containerPickerText : styles.containerPickerPlaceholder}>
              {locationName || 'Select a location'}
            </Text>
          </TouchableOpacity>
          {locationName && (
            <TouchableOpacity
              style={styles.clearContainerButton}
              onPress={() => {
                setLocationId(null);
                setLocationName('');
                setContainerId(null);
                setContainerName('');
              }}
            >
              <Text style={styles.clearContainerText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Container Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Container (Optional)</Text>
          <TouchableOpacity
            style={styles.containerPicker}
            onPress={() => {
              if (!locationId) {
                Alert.alert('Select Location First', 'Please select a location before choosing a container.');
                setShowLocationPicker(true);
              } else {
                setShowContainerPicker(true);
              }
            }}
          >
            <Text style={containerName ? styles.containerPickerText : styles.containerPickerPlaceholder}>
              {containerName || 'Select a container'}
            </Text>
          </TouchableOpacity>
          {containerName && (
            <TouchableOpacity
              style={styles.clearContainerButton}
              onPress={() => {
                setContainerId(null);
                setContainerName('');
              }}
            >
              <Text style={styles.clearContainerText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          disabled={isSaving}
        >
          <Package color="#111827" size={20} />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Item'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <MobileBarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <MobileCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onImageCaptured={handleImageCaptured}
      />

      <MobileCamera
        visible={showReceiptCamera}
        onClose={() => setShowReceiptCamera(false)}
        onImageCaptured={handleReceiptPhotoTaken}
      />

      <MobileShelfAnalyzer
        visible={showShelfAnalyzer}
        onClose={() => setShowShelfAnalyzer(false)}
        onItemsDetected={handleDetectedItems}
      />

      {/* Container Picker Modal */}
      <Modal
        visible={showContainerPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowContainerPicker(false)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Container</Text>
            <TouchableOpacity onPress={() => {
              setShowContainerPicker(false);
              setShowCreateContainer(true);
            }}>
              <Plus color="#3B82F6" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredContainers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setContainerId(item.id);
                  setContainerName(item.name);
                  setShowContainerPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Package color="#6B7280" size={20} />
                <Text style={styles.pickerItemText} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPickerContainer}>
                <Text style={styles.emptyPickerText}>No containers in this location</Text>
                <TouchableOpacity
                  style={styles.createContainerButton}
                  onPress={() => {
                    setShowContainerPicker(false);
                    setShowCreateContainer(true);
                  }}
                >
                  <Plus color="#3B82F6" size={20} />
                  <Text style={styles.createContainerButtonText}>Create Container</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Location</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  const locationChanged = item.id !== locationId;
                  setLocationId(item.id);
                  setLocationName(item.name);
                  if (locationChanged) {
                    setContainerId(null);
                    setContainerName('');
                  }
                  setShowLocationPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Package color="#6B7280" size={20} />
                <Text style={styles.pickerItemText} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Create Container Modal */}
      <Modal
        visible={showCreateContainer}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => {
              setShowCreateContainer(false);
              setNewContainerName('');
            }}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>New Container</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.createContainerForm}>
            <View style={styles.field}>
              <Text style={styles.label}>Container Name</Text>
              <TextInput
                value={newContainerName}
                onChangeText={setNewContainerName}
                placeholder="e.g., Storage Box #1, Basement Bin"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.selectedLocationText}>{locationName}</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreateContainer}
            >
              <Package color="#111827" size={20} />
              <Text style={styles.saveButtonText}>Create Container</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Premium Paywall */}
      <PaywallScreen
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          setShowPaywall(false);
          // Allow user to continue adding item after purchase
        }}
        reason="item_limit"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FACC15',
    borderStyle: 'dashed',
  },
    analyzeButton: {
      marginTop: 8,
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: '#111827',
    },
    analyzeButtonText: {
      color: 'white',
      fontWeight: '700',
    },
  addImageText: {
    color: '#FACC15',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  barcodeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 16,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  containerPicker: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  containerPickerText: {
    fontSize: 16,
    color: '#111827',
  },
  containerPickerPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  clearContainerButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearContainerText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  pickerModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    flexShrink: 1,
  },
  emptyPickerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  createContainerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  createContainerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  createContainerForm: {
    padding: 20,
  },
  selectedLocationText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: '#111827',
  },
  closeDatePickerButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeDatePickerText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

// Add PaywallScreen at the end of component
// Find the closing </View> tags and add before the last one
