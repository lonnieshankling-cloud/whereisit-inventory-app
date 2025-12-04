import * as Haptics from 'expo-haptics';
import { Box, Camera, Package, Plus, X } from 'lucide-react-native';
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
import { MobileCamera } from '../components/MobileCamera';
import { databaseService, LocalContainer, LocalItem } from '../services/databaseService';

interface ContainerManagementScreenProps {
  onClose?: () => void;
}

export default function ContainerManagementScreen({ onClose }: ContainerManagementScreenProps) {
  const [containers, setContainers] = useState<LocalContainer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<LocalContainer | null>(null);
  const [containerItems, setContainerItems] = useState<LocalItem[]>([]);
  
  // Add container form state
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerPhoto, setNewContainerPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    try {
      await databaseService.initialize();
      const allContainers = await databaseService.getAllContainers();
      setContainers(allContainers);
    } catch (error) {
      console.error('Failed to load containers:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContainers();
    setRefreshing(false);
  };

  const handleAddContainer = async () => {
    if (!newContainerName.trim()) {
      Alert.alert('Error', 'Please enter a container name');
      return;
    }

    try {
      const containerId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await databaseService.createContainer({
        id: containerId,
        name: newContainerName.trim(),
        local_photo_uri: newContainerPhoto || undefined,
        synced: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddModal(false);
      setNewContainerName('');
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
      const items = await databaseService.getItemsByContainer(container.id);
      setContainerItems(items);
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
    setNewContainerPhoto(uri);
    setShowCamera(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const renderContainer = ({ item }: { item: LocalContainer }) => {
    const [itemCount, setItemCount] = useState(0);

    useEffect(() => {
      const loadCount = async () => {
        const items = await databaseService.getItemsByContainer(item.id);
        setItemCount(items.length);
      };
      loadCount();
    }, []);

    return (
      <TouchableOpacity
        style={styles.containerCard}
        onPress={() => handleContainerPress(item)}
        onLongPress={() => handleDeleteContainer(item)}
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

  const renderItem = ({ item }: { item: LocalItem }) => (
    <View style={styles.itemCard}>
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
    </View>
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
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Plus color="#3B82F6" size={24} />
        </TouchableOpacity>
      </View>

      {/* Containers List */}
      <FlatList
        data={containers}
        renderItem={renderContainer}
        keyExtractor={(item) => item.id}
        numColumns={2}
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
            <TouchableOpacity style={styles.photoButton} onPress={() => setShowCamera(true)}>
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
    fontSize: 24,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  containerItemCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
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
    fontSize: 20,
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
    fontSize: 14,
    color: '#9CA3AF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 20,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
});
