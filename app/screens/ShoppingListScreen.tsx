import { logShoppingItemAdded, logShoppingItemPurchased } from '@/utils/analytics';
import * as Haptics from 'expo-haptics';
import { Check, Plus, RefreshCw, ShoppingCart, Trash2, X, ShoppingBag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LocalShoppingItem } from '../../services/databaseService';
import { shoppingListService } from '../../services/shoppingListService';
import { openStoreSearch } from '@/utils/affiliate';

interface ShoppingListScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function ShoppingListScreen({ visible, onClose }: ShoppingListScreenProps) {
  const [items, setItems] = useState<LocalShoppingItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadItems();
      // Try to sync with backend when screen opens
      syncWithBackend();
    }
  }, [visible]);

  useEffect(() => {
    // Listen for sync state changes
    const unsubscribe = shoppingListService.onSyncStateChange(() => {
      setIsSyncing(shoppingListService.getIsSyncing());
    });
    return unsubscribe;
  }, []);

  const loadItems = async () => {
    try {
      await shoppingListService.initialize();
      const shoppingItems = await shoppingListService.getShoppingList();
      setItems(shoppingItems);
    } catch (error) {
      console.error('Failed to load shopping list:', error);
      Alert.alert('Error', 'Failed to load shopping list');
    }
  };

  const syncWithBackend = async () => {
    try {
      await shoppingListService.syncWithBackend();
      await loadItems();
    } catch (error) {
      console.warn('Sync with backend failed:', error);
      // Don't show error to user - offline mode is fine
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await syncWithBackend();
    setRefreshing(false);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    try {
      const quantity = parseInt(newItemQuantity) || 1;
      await shoppingListService.addItem(newItemName.trim(), quantity);
      
      // Track shopping item added
      await logShoppingItemAdded(newItemName.trim());
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewItemName('');
      setNewItemQuantity('1');
      setShowAddModal(false);
      await loadItems();
    } catch (error) {
      console.error('Failed to add item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleTogglePurchased = async (item: LocalShoppingItem) => {
    try {
      const wasPurchased = item.is_purchased;
      await shoppingListService.updateItem(item.id, {
        is_purchased: item.is_purchased ? 0 : 1,
      });
      
      // Track when item is marked as purchased
      if (!wasPurchased) {
        await logShoppingItemPurchased(item.item_name || 'Unknown Item');
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadItems();
    } catch (error) {
      console.error('Failed to update item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleDeleteItem = async (item: LocalShoppingItem) => {
    Alert.alert('Delete Item', `Remove "${item.item_name}" from shopping list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await shoppingListService.deleteItem(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadItems();
          } catch (error) {
            console.error('Failed to delete item:', error);
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleClearPurchased = async () => {
    const purchasedCount = items.filter((i) => i.is_purchased).length;
    if (purchasedCount === 0) {
      Alert.alert('Info', 'No purchased items to clear');
      return;
    }

    Alert.alert(
      'Clear Purchased Items',
      `Remove ${purchasedCount} purchased item${purchasedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListService.clearPurchasedItems();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadItems();
            } catch (error) {
              console.error('Failed to clear purchased items:', error);
              Alert.alert('Error', 'Failed to clear purchased items');
            }
          },
        },
      ]
    );
  };

  const activeItems = items.filter((i) => !i.is_purchased);
  const purchasedItems = items.filter((i) => i.is_purchased);

  const renderItem = ({ item }: { item: LocalShoppingItem }) => (
    <View style={[styles.itemCard, item.is_purchased === 1 && styles.itemCardPurchased]}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => handleTogglePurchased(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, item.is_purchased === 1 && styles.checkboxChecked]}>
          {item.is_purchased === 1 && <Check color="#fff" size={18} />}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.is_purchased === 1 && styles.itemNamePurchased]} numberOfLines={2} ellipsizeMode="tail">
            {item.item_name || 'Unknown Item'}
          </Text>
          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => openStoreSearch(item.item_name)}
      >
        <ShoppingBag color="#2563EB" size={20} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item)}
      >
        <Trash2 color="#EF4444" size={20} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping List</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={syncWithBackend} style={styles.syncButton} disabled={isSyncing}>
              {isSyncing ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <RefreshCw color="#3B82F6" size={20} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Plus color="#3B82F6" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeItems.length}</Text>
            <Text style={styles.statLabel}>To Buy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{purchasedItems.length}</Text>
            <Text style={styles.statLabel}>Purchased</Text>
          </View>
        </View>

        {/* Clear Purchased Button */}
        {purchasedItems.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearPurchased}>
            <Trash2 color="#EF4444" size={16} />
            <Text style={styles.clearButtonText}>Clear Purchased</Text>
          </TouchableOpacity>
        )}

        {/* Shopping List */}
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? styles.listContentEmpty : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingCart color="#9ca3af" size={64} />
              <Text style={styles.emptyText}>Shopping list is empty</Text>
              <Text style={styles.emptySubtext}>Add items you need to buy</Text>
            </View>
          }
        />

        {/* Add Item Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="formSheet"
          transparent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addModal}>
              <View style={styles.addModalHeader}>
                <Text style={styles.addModalTitle}>Add Item</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X color="#111827" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.addModalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newItemName}
                    onChangeText={setNewItemName}
                    placeholder="e.g., Milk, Bread, Eggs"
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={newItemQuantity}
                    onChangeText={setNewItemQuantity}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                </View>

                <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
                  <Plus color="#fff" size={20} />
                  <Text style={styles.addButtonText}>Add to List</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncButton: {
    padding: 4,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardPurchased: {
    opacity: 0.6,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  addModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addModalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
