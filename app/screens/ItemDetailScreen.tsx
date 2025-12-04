import * as Haptics from 'expo-haptics';
import { Barcode, Calendar, DollarSign, Edit2, Package, Save, ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react-native';
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
import { databaseService, LocalContainer, LocalItem } from '../services/databaseService';
import { shoppingListService } from '../services/shoppingListService';

interface ItemDetailScreenProps {
  item: LocalItem;
  visible: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  onItemDeleted: () => void;
}

export default function ItemDetailScreen({
  item,
  visible,
  onClose,
  onItemUpdated,
  onItemDeleted,
}: ItemDetailScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [barcode, setBarcode] = useState(item.barcode || '');
  const [quantity, setQuantity] = useState(item.quantity?.toString() || '1');
  const [minQuantity, setMinQuantity] = useState(item.min_quantity?.toString() || '');
  const [purchasePrice, setPurchasePrice] = useState(item.purchase_price?.toString() || '');
  const [purchaseStore, setPurchaseStore] = useState(item.purchase_store || '');
  const [imageUri, setImageUri] = useState(item.local_photo_uri || item.photo_url || '');
  const [locationId, setLocationId] = useState(item.location_id || '');
  const [locationName, setLocationName] = useState('');
  const [containerId, setContainerId] = useState(item.container_id || '');
  const [containerName, setContainerName] = useState('');
  const [containers, setContainers] = useState<LocalContainer[]>([]);
  
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showContainerPicker, setShowContainerPicker] = useState(false);
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

  // Load containers and initialize names
  useEffect(() => {
    loadContainers();
    
    if (item.location_id) {
      const location = locations.find(loc => loc.id === item.location_id);
      if (location) {
        setLocationName(location.name);
      }
    }
  }, []);

  useEffect(() => {
    if (item.container_id && containers.length > 0) {
      const container = containers.find(c => c.id === item.container_id);
      if (container) {
        setContainerName(container.name);
      }
    }
  }, [containers]);

  const loadContainers = async () => {
    try {
      const fetchedContainers = await databaseService.getAllContainers();
      setContainers(fetchedContainers);
    } catch (error) {
      console.error('Failed to load containers:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    setIsSaving(true);
    try {
      await databaseService.updateItem(item.id, {
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
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      onItemUpdated();
      Alert.alert('Success', 'Item updated!');
    } catch (error) {
      console.error('Failed to update item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteItem(item.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onItemDeleted();
              Alert.alert('Success', 'Item deleted');
            } catch (error) {
              console.error('Failed to delete item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleBarcodeScanned = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setShowBarcodeScanner(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleImageCaptured = (uri: string) => {
    setImageUri(uri);
    setShowCamera(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAddToShoppingList = async () => {
    try {
      await shoppingListService.addItem(item.name, item.quantity || 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Added "${item.name}" to shopping list`);
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      Alert.alert('Error', 'Failed to add item to shopping list');
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string | number; icon: any }) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <Icon color="#6B7280" size={16} />
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Item' : 'Item Details'}</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Edit2 color="#3B82F6" size={24} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView style={styles.content}>
          {/* Image */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => isEditing && setShowCamera(true)}
            disabled={!isEditing}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Package color="#9CA3AF" size={48} />
                {isEditing && <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>}
              </View>
            )}
          </TouchableOpacity>

          {isEditing ? (
            /* Edit Form */
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Item name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Location</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowLocationPicker(true)}
                >
                  <Text style={locationName ? styles.inputText : styles.inputPlaceholder}>
                    {locationName || 'Select a location'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Container</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowContainerPicker(true)}
                >
                  <Text style={containerName ? styles.inputText : styles.inputPlaceholder}>
                    {containerName || 'Select a container (optional)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Barcode</Text>
                <View style={styles.barcodeRow}>
                  <TextInput
                    value={barcode}
                    onChangeText={setBarcode}
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Scan or enter barcode"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    onPress={() => setShowBarcodeScanner(true)}
                    style={styles.scanButton}
                  >
                    <Barcode color="white" size={20} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Minimum Quantity (Low Stock Alert)</Text>
                <TextInput
                  value={minQuantity}
                  onChangeText={setMinQuantity}
                  style={styles.input}
                  placeholder="Leave empty to disable alerts"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>Get notified when stock falls below this amount</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Price</Text>
                <TextInput
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Store</Text>
                <TextInput
                  value={purchaseStore}
                  onChangeText={setPurchaseStore}
                  style={styles.input}
                  placeholder="Purchase location"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          ) : (
            /* View Mode */
            <View style={styles.details}>
              <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
              
              <View style={styles.infoSection}>
                <InfoRow label="Quantity" value={item.quantity} icon={Package} />
                <InfoRow label="Container" value={containerName} icon={Package} />
                <InfoRow label="Barcode" value={item.barcode} icon={Barcode} />
                <InfoRow label="Price" value={item.purchase_price ? `$${item.purchase_price.toFixed(2)}` : undefined} icon={DollarSign} />
                <InfoRow label="Store" value={item.purchase_store} icon={ShoppingBag} />
                <InfoRow label="Date" value={item.purchase_date} icon={Calendar} />
              </View>

              {item.synced === 0 && (
                <View style={styles.unsyncedBadge}>
                  <Text style={styles.unsyncedText}>Not Synced to Cloud</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {isEditing ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false);
                  // Reset form
                  setName(item.name);
                  setDescription(item.description || '');
                  setBarcode(item.barcode || '');
                  setQuantity(item.quantity?.toString() || '1');
                  setPurchasePrice(item.purchase_price?.toString() || '');
                  setPurchaseStore(item.purchase_store || '');
                  setImageUri(item.local_photo_uri || item.photo_url || '');
                }}
              >
                <X color="#6B7280" size={20} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Save color="#fff" size={20} />
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.shoppingButton]}
                onPress={handleAddToShoppingList}
              >
                <ShoppingCart color="#fff" size={20} />
                <Text style={styles.shoppingButtonText}>Add to Shopping</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
                <Trash2 color="#fff" size={20} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
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
              renderItem={({ item: location }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setLocationId(location.id);
                    setLocationName(location.name);
                    setShowLocationPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Package color="#6B7280" size={20} />
                  <Text style={styles.pickerItemText}>{location.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>

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
              data={[{ id: '', name: 'None' }, ...containers]}
              keyExtractor={(item) => item.id || 'none'}
              renderItem={({ item: container }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setContainerId(container.id);
                    setContainerName(container.name === 'None' ? '' : container.name);
                    setShowContainerPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Package color="#6B7280" size={20} />
                  <Text style={styles.pickerItemText}>
                    {container.name}
                    {container.id && 'location_id' in container && container.location_id && (
                      <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                        {' '}• {locations.find(l => l.id === container.location_id)?.name}
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Package color="#9CA3AF" size={48} />
                  <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 16 }}>
                    No containers yet
                  </Text>
                  <Text style={{ marginTop: 4, color: '#9CA3AF', fontSize: 14 }}>
                    Create containers in the Containers tab
                  </Text>
                </View>
              }
            />
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    padding: 20,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  details: {
    padding: 20,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  itemDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },
  unsyncedBadge: {
    marginTop: 20,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  unsyncedText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputText: {
    fontSize: 16,
    color: '#111827',
  },
  inputPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
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
  },
  shoppingButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  shoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
