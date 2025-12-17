import * as Haptics from 'expo-haptics';
import { Box, Camera, Package, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MobileCamera } from '../../components/MobileCamera';
import { databaseService, LocalContainer, LocalItem } from '../../services/databaseService';
import ItemDetailScreen from './ItemDetailScreen';

interface ContainerManagementScreenProps {
  onClose?: () => void;
}

export default function ContainerManagementScreen({ onClose }: ContainerManagementScreenProps) {
  const [containers, setContainers] = useState<LocalContainer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<LocalContainer | null>(null);
  const [containerItems, setContainerItems] = useState<LocalItem[]>([]);
  const [containerItemCounts, setContainerItemCounts] = useState<Record<string, number>>({});
  const [selectedItem, setSelectedItem] = useState<LocalItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  
  // Add container form state
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerLocation, setNewContainerLocation] = useState<string | null>(null);
  const [newContainerPhoto, setNewContainerPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraModeForAdd, setCameraModeForAdd] = useState<'add' | 'edit'>('add');

  // Edit container form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContainer, setEditingContainer] = useState<LocalContainer | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editCameraMode, setEditCameraMode] = useState<'add' | 'edit'>('add');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [locations, setLocations] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    loadContainers();
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      await databaseService.initialize();
      const allLocations = await databaseService.getAllLocations();
      setLocations(allLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadContainers = async () => {
    try {
      await databaseService.initialize();
      const allContainers = await databaseService.getAllContainers();
      setContainers(allContainers);
      
      // Load item counts for each container
      const counts: Record<string, number> = {};
      for (const container of allContainers) {
        const items = await databaseService.getItemsByContainer(container.id);
        counts[container.id] = items.length;
      }
      setContainerItemCounts(counts);
    } catch (error) {
      console.error('Failed to load containers:', error);
    }
  };

  const refreshContainerItems = async (containerId: string) => {
    const items = await databaseService.getItemsByContainer(containerId);
    setContainerItems(items);
    setContainerItemCounts((prev) => ({ ...prev, [containerId]: items.length }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContainers();
    setRefreshing(false);
  };

  const handleAddContainer = async () => {
    if (!newContainerLocation) {
      Alert.alert('Error', 'Please select a location for this container');
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
        location_id: newContainerLocation,
        local_photo_uri: newContainerPhoto || undefined,
        synced: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddModal(false);
      setNewContainerName('');
      setNewContainerLocation(null);
      setNewContainerPhoto(null);
      await loadContainers();
      Alert.alert('Success', 'Container created!');
    } catch (error) {
      console.error('Failed to create container:', error);
      Alert.alert('Error', 'Failed to create container');
    }
  };

  const handleContainerPress = async (container: LocalContainer) => {
    try {
      setSelectedContainer(container);
      await refreshContainerItems(container.id);
    } catch (error) {
      console.error('Failed to load container items:', error);
    }
  };

  const handleDeleteContainer = async (container: LocalContainer) => {
    Alert.alert(
      'Delete Container',
      `Are you sure you want to delete "${container.name}"? Items in this container will not be deleted, just unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Unassign all items from this container
              const items = await databaseService.getItemsByContainer(container.id);
              for (const item of items) {
                await databaseService.updateItem(item.id, { container_id: undefined });
              }
              
              await databaseService.deleteContainer(container.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadContainers();
              Alert.alert('Success', 'Container deleted');
            } catch (error) {
              console.error('Failed to delete container:', error);
              Alert.alert('Error', 'Failed to delete container');
            }
          },
        },
      ]
    );
  };

  const handlePhotoTaken = (uri: string) => {
    if (cameraModeForAdd === 'edit') {
      setEditPhoto(uri);
    } else {
      setNewContainerPhoto(uri);
    }
    setShowCamera(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleOpenEditModal = (container: LocalContainer) => {
    setEditingContainer(container);
    setEditName(container.name);
    setEditLocation(container.location_id || null);
    setEditPhoto(container.local_photo_uri || container.photo_url || null);
    setEditCameraMode('edit');
    setShowEditModal(true);
  };

  const handleUpdateContainer = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter a container name');
      return;
    }

    if (!editingContainer) return;

    setIsSavingEdit(true);
    try {
      await databaseService.updateContainer(editingContainer.id, {
        name: editName.trim(),
        location_id: editLocation || undefined,
        local_photo_uri: editPhoto || undefined,
        synced: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
      setEditingContainer(null);
      setEditName('');
      setEditLocation(null);
      setEditPhoto(null);
      await loadContainers();
      Alert.alert('Success', 'Container updated!');
    } catch (error) {
      console.error('Failed to update container:', error);
      Alert.alert('Error', 'Failed to update container');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editingContainer) return;
    setShowEditModal(false);
    handleDeleteContainer(editingContainer);
  };

  // Group containers by location
  const groupContainersByLocation = () => {
    const grouped: Record<string, LocalContainer[]> = {};
    
    containers.forEach((container) => {
      const locationId = container.location_id || 'unassigned';
      if (!grouped[locationId]) {
        grouped[locationId] = [];
      }
      grouped[locationId].push(container);
    });

    return grouped;
  };

  const getLocationName = (locationId: string) => {
    if (locationId === 'unassigned') return 'Unassigned';
    return locations.find(loc => loc.id === locationId)?.name || locationId;
  };

  const renderContainer = ({ item }: { item: LocalContainer }) => {
    const itemCount = containerItemCounts[item.id] || 0;

    return (
      <TouchableOpacity
        style={styles.containerCard}
        onPress={() => handleContainerPress(item)}
        onLongPress={() => handleOpenEditModal(item)}
      >
        <View style={styles.containerImageContainer}>
          {item.local_photo_uri || item.photo_url ? (
            <Image
              source={{ uri: item.local_photo_uri || item.photo_url }}
              style={styles.containerImage}
            />
          ) : (
            <View style={styles.containerImagePlaceholder}>
              <Box color="#9CA3AF" size={32} />
            </View>
          )}
        </View>
        <View style={styles.containerInfo}>
          <Text style={styles.containerName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.containerItemCount}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleItemTap = (item: LocalItem) => {
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const handleItemUpdated = async () => {
    if (selectedContainer) {
      await refreshContainerItems(selectedContainer.id);
    }
    await loadContainers();
  };

  const handleItemDeleted = async () => {
    setShowItemDetail(false);
    setSelectedItem(null);
    if (selectedContainer) {
      await refreshContainerItems(selectedContainer.id);
    }
    await loadContainers();
  };

  const renderItem = ({ item }: { item: LocalItem }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => handleItemTap(item)}>
      {(item.local_photo_uri || item.photo_url) && (
        <Image
          source={{ uri: item.local_photo_uri || item.photo_url }}
          style={styles.itemImage}
        />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#111827" size={24} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Containers ({containers.length})</Text>
        <TouchableOpacity onPress={() => {
          setNewContainerName('');
          setNewContainerLocation(null);
          setNewContainerPhoto(null);
          setShowAddModal(true);
        }} style={styles.addButton}>
          <Plus color="#3B82F6" size={24} />
        </TouchableOpacity>
      </View>

      {/* Containers List - Grouped by Location */}
      <FlatList
        data={Object.entries(groupContainersByLocation()).flatMap(([locationId, locationContainers]) => [
          { type: 'location', id: locationId, name: getLocationName(locationId) } as const,
          ...locationContainers.map(container => ({ type: 'container', ...container } as const)),
        ])}
        renderItem={(props) => {
          const item = props.item;
          if (item.type === 'location') {
            return (
              <View style={styles.locationSection}>
                <Text style={styles.locationHeader}>{item.name}</Text>
              </View>
            );
          }
          return renderContainer({ item });
        }}
        keyExtractor={(item, index) => 
          item.type === 'location' ? `location-${item.id}` : item.id
        }
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={containers.length === 0 ? styles.listContentEmpty : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Box color="#9ca3af" size={64} />
            <Text style={styles.emptyText}>No containers yet</Text>
            <Text style={styles.emptySubtext}>Create containers to organize your items</Text>
          </View>
        }
      />

      {/* Add Container Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Container</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.form}>
            {/* Photo */}
            <TouchableOpacity style={styles.photoButton} onPress={() => {
              setCameraModeForAdd('add');
              setShowCamera(true);
            }}>
              {newContainerPhoto ? (
                <Image source={{ uri: newContainerPhoto }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera color="#9CA3AF" size={32} />
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Container Name</Text>
              <TextInput
                style={styles.input}
                value={newContainerName}
                onChangeText={setNewContainerName}
                placeholder="e.g., Storage Box #1, Basement Bin"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              <FlatList
                data={locations}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.locationItem,
                      newContainerLocation === item.id && styles.locationItemSelected,
                    ]}
                    onPress={() => setNewContainerLocation(item.id)}
                  >
                    <Text style={[
                      styles.locationItemText,
                      newContainerLocation === item.id && styles.locationItemTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.noLocationsText}>No locations available</Text>
                }
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleAddContainer}>
              <Text style={styles.saveButtonText}>Create Container</Text>
            </TouchableOpacity>
          </View>

          {/* Camera Modal */}
          <MobileCamera 
            visible={showCamera}
            onClose={() => setShowCamera(false)}
            onImageCaptured={handlePhotoTaken}
          />
        </View>
      </Modal>

      {/* Container Details Modal */}
      <Modal
        visible={selectedContainer !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity onPress={() => setSelectedContainer(null)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>{selectedContainer?.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={containerItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.detailsListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Package color="#9ca3af" size={48} />
                <Text style={styles.emptyText}>No items in this container</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {selectedItem && (
        <ItemDetailScreen
          item={selectedItem}
          visible={showItemDetail}
          onClose={() => {
            setShowItemDetail(false);
            setSelectedItem(null);
          }}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}

      {/* Edit Container Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowEditModal(false);
              setEditingContainer(null);
              setEditName('');
              setEditLocation(null);
              setEditPhoto(null);
            }}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Container</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.form, { flex: 1 }]}>
            {/* Photo */}
            <TouchableOpacity style={styles.photoButton} onPress={() => {
              setCameraModeForAdd('edit');
              setShowCamera(true);
            }}>
              {editPhoto ? (
                <Image source={{ uri: editPhoto }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera color="#9CA3AF" size={32} />
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Clear Photo Button */}
            {editPhoto && (
              <TouchableOpacity 
                style={styles.clearPhotoButton}
                onPress={() => setEditPhoto(null)}
              >
                <Text style={styles.clearPhotoButtonText}>Remove Photo</Text>
              </TouchableOpacity>
            )}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Container Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g., Storage Box #1, Basement Bin"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Location Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              <FlatList
                data={locations}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.locationItem,
                      editLocation === item.id && styles.locationItemSelected,
                    ]}
                    onPress={() => setEditLocation(item.id)}
                  >
                    <Text style={[
                      styles.locationItemText,
                      editLocation === item.id && styles.locationItemTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.noLocationsText}>No locations available</Text>
                }
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.editModalFooter}>
            <TouchableOpacity 
              style={[styles.deleteButton, styles.footerButton]}
              onPress={handleDeleteFromEdit}
              disabled={isSavingEdit}
            >
              <Trash2 color="#EF4444" size={18} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, styles.footerButton]}
              onPress={handleUpdateContainer}
              disabled={isSavingEdit}
            >
              <Text style={styles.saveButtonText}>
                {isSavingEdit ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Camera Modal */}
          <MobileCamera 
            visible={showCamera}
            onClose={() => setShowCamera(false)}
            onImageCaptured={handlePhotoTaken}
          />
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: '47%',
  },
  containerImageContainer: {
    marginBottom: 8,
  },
  containerImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  containerImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerInfo: {
    gap: 4,
  },
  containerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flexWrap: 'wrap',
  },
  containerItemCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    padding: 20,
  },
  photoButton: {
    marginBottom: 20,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  detailsHeader: {
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
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailsListContent: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  itemDescription: {
    fontSize: 11,
    color: '#6B7280',
    flexWrap: 'wrap',
  },
  clearPhotoButton: {
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearPhotoButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  locationDropdownWrapper: {
    marginBottom: 0,
  },
  locationDropdown: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  locationDropdownText: {
    fontSize: 14,
    color: '#111827',
  },
  locationItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  locationItemSelected: {
    backgroundColor: '#DBEAFE',
  },
  locationItemText: {
    fontSize: 14,
    color: '#111827',
  },
  locationItemTextSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  noLocationsText: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  editModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  locationSection: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    marginTop: 8,
  },
  locationHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
