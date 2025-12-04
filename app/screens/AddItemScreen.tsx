import { logBarcodeScanned, logItemAdded, logPhotoTaken } from '@/utils/analytics';
import { canAddItem, FREE_ITEM_LIMIT, getRemainingItems } from '@/utils/premium';
import * as Haptics from 'expo-haptics';
import { Barcode, Camera, Package, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MobileBarcodeScannerModal } from '../components/MobileBarcodeScannerModal';
import { MobileCamera } from '../components/MobileCamera';
import { databaseService } from '../services/databaseService';
import PaywallScreen from './PaywallScreen';

interface AddItemScreenProps {
  onClose?: () => void;
  onItemAdded?: () => void;
}

export default function AddItemScreen({ onClose, onItemAdded }: AddItemScreenProps = {}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [minQuantity, setMinQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseStore, setPurchaseStore] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [containerName, setContainerName] = useState<string>('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showContainerPicker, setShowContainerPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [containers, setContainers] = useState<Array<{id: string, name: string}>>([]);
  const [locations] = useState<Array<{id: string, name: string}>>([
    { id: 'bedroom', name: 'Bedroom' },
    { id: 'entertainment-room', name: 'Entertainment Room' },
    { id: 'living-room', name: 'Living Room' },
    { id: 'girls-room', name: 'Girls Room' },
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'garage', name: 'Garage' },
    { id: 'office', name: 'Office' },
    { id: 'masters-bathroom', name: 'Masters Bathroom' },
    { id: 'front-yard', name: 'Front Yard' },
    { id: 'backyard', name: 'Backyard' },
    { id: 'dining-room', name: 'Dining Room' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize database service and load containers
    const init = async () => {
      try {
        await databaseService.initialize();
        const allContainers = await databaseService.getAllContainers();
        setContainers(allContainers.map(c => ({ id: c.id, name: c.name })));
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
  };

  const handleImageCaptured = async (uri: string) => {
    setImageUri(uri);
    setShowCamera(false);
    
    // Track photo taken
    await logPhotoTaken('camera');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    // Check premium status and item limit
    try {
      await databaseService.initialize();
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
        local_photo_uri: imageUri || undefined,
        photo_url: undefined,
        synced: 0,
      };

      console.log('Saving item to database:', newItem);
      
      // Save to local database
      await databaseService.createItem(newItem);
      
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item</Text>
        <View style={{ width: 40 }} />
      </View>



      <ScrollView style={styles.content}>
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
              }}
            >
              <Text style={styles.clearContainerText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Container Selection */}
        {containers.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Container (Optional)</Text>
            <TouchableOpacity
              style={styles.containerPicker}
              onPress={() => setShowContainerPicker(true)}
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
        )}

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
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={containers}
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
                  setLocationId(item.id);
                  setLocationName(item.name);
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
    </View>
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
});

// Add PaywallScreen at the end of component
// Find the closing </View> tags and add before the last one
