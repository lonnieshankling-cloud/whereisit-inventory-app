import { logItemViewed, logSearchPerformed } from '@/utils/analytics';
import { Check, Filter, MapPin, Minus, Package, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { databaseService, LocalItem } from '../services/databaseService';
import { ShoppingListService } from '../services/shoppingListService';
import ItemDetailScreen from './ItemDetailScreen';

interface ItemsListScreenProps {
  onClose?: () => void;
  initialLocationFilter?: string | null;
  showLowStockOnly?: boolean;
  initialSearchQuery?: string;
}

export default function ItemsListScreen({ onClose, initialLocationFilter, showLowStockOnly, initialSearchQuery }: ItemsListScreenProps) {
  const [items, setItems] = useState<LocalItem[]>([]);
  const [allItems, setAllItems] = useState<LocalItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LocalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(initialLocationFilter || null);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(showLowStockOnly || false);
  const [categories, setCategories] = useState<string[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const shoppingListService = useRef(new ShoppingListService()).current;
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

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (initialLocationFilter && allItems.length > 0) {
      filterItems(allItems, selectedCategory, initialLocationFilter, searchQuery);
    }
  }, [initialLocationFilter, allItems]);

  useEffect(() => {
    if (initialSearchQuery && allItems.length > 0) {
      filterItems(allItems, selectedCategory, selectedLocation, initialSearchQuery);
    }
  }, [initialSearchQuery, allItems]);

  const loadItems = async () => {
    try {
      await databaseService.initialize();
      const fetchedItems = await databaseService.getAllItems();
      setAllItems(fetchedItems);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(fetchedItems.map(item => item.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories.sort());
      
      // Apply filter
      filterItems(fetchedItems, selectedCategory, selectedLocation, searchQuery);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const filterItems = (itemsList: LocalItem[], category: string | null, location: string | null, search: string, lowStock?: boolean) => {
    let filtered = itemsList;
    
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (location) {
      filtered = filtered.filter(item => item.location_id === location);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.barcode?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply low stock filter
    const useLowStockFilter = lowStock !== undefined ? lowStock : lowStockFilter;
    if (useLowStockFilter) {
      filtered = filtered.filter(item => isLowStock(item));
    }
    
    setItems(filtered);
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
    filterItems(allItems, category, selectedLocation, searchQuery);
  };

  const handleLocationFilter = (location: string | null) => {
    setSelectedLocation(location);
    filterItems(allItems, selectedCategory, location, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Debounce search to avoid filtering on every keystroke
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      filterItems(allItems, selectedCategory, selectedLocation, query);
      
      // Track search with result count
      if (query.trim()) {
        const filtered = allItems.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.barcode?.toLowerCase().includes(query.toLowerCase())
        );
        logSearchPerformed(query, filtered.length);
      }
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    filterItems(allItems, selectedCategory, selectedLocation, '');
  };

  const handleToggleLowStockFilter = () => {
    const newValue = !lowStockFilter;
    setLowStockFilter(newValue);
    filterItems(allItems, selectedCategory, selectedLocation, searchQuery, newValue);
  };

  const handleClearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedLocation(null);
    setSearchQuery('');
    setLowStockFilter(false);
    filterItems(allItems, null, null, '', false);
  };

  const handleQuantityChange = async (item: LocalItem, delta: number) => {
    const newQuantity = Math.max(0, (item.quantity || 1) + delta);
    try {
      await databaseService.updateItem(item.id, { quantity: newQuantity });
      await loadItems();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleItemPress = async (item: LocalItem) => {
    if (selectionMode) {
      toggleItemSelection(item.id);
    } else {
      // Track item view
      await logItemViewed(item.id);
      
      setSelectedItem(item);
      setShowDetailModal(true);
    }
  };

  const handleItemLongPress = async (item: LocalItem) => {
    // Long press always opens detail screen, even in selection mode
    try {
      const Haptics = await import('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available
    }
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleItemUpdated = async () => {
    await loadItems();
  };

  const handleItemDeleted = async () => {
    setShowDetailModal(false);
    setSelectedItem(null);
    await loadItems();
  };

  const handleDetailClose = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
  };

  // Selection Mode Functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    const allIds = new Set(items.map(item => item.id));
    setSelectedItems(allIds);
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  // Bulk Operation Handlers
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const itemId of selectedItems) {
                await databaseService.deleteItem(itemId);
              }
              setSelectionMode(false);
              setSelectedItems(new Set());
              await loadItems();
            } catch (error) {
              console.error('Failed to delete items:', error);
              Alert.alert('Error', 'Failed to delete some items');
            }
          },
        },
      ]
    );
  };

  const handleBulkAddToShopping = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      const selectedItemsData = items.filter(item => selectedItems.has(item.id));
      let addedCount = 0;
      
      for (const item of selectedItemsData) {
        await shoppingListService.addItem(item.name, item.quantity || 1);
        addedCount++;
      }
      
      Alert.alert('Success', `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to shopping list`);
      setSelectionMode(false);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to add items to shopping list:', error);
      Alert.alert('Error', 'Failed to add some items to shopping list');
    }
  };

  const handleBulkChangeLocation = () => {
    if (selectedItems.size === 0) return;
    
    // Show location picker
    Alert.alert(
      'Change Location',
      `Select new location for ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...locations.map(location => ({
          text: location.name,
          onPress: async () => {
            try {
              for (const itemId of selectedItems) {
                await databaseService.updateItem(itemId, { location_id: location.id });
              }
              Alert.alert('Success', `Moved ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} to ${location.name}`);
              setSelectionMode(false);
              setSelectedItems(new Set());
              await loadItems();
            } catch (error) {
              console.error('Failed to update location:', error);
              Alert.alert('Error', 'Failed to update location for some items');
            }
          },
        })),
      ]
    );
  };

  const isLowStock = (item: LocalItem): boolean => {
    if (!item.min_quantity) return false;
    const quantity = item.quantity || 0;
    return quantity <= item.min_quantity;
  };

  const renderItem = ({ item }: { item: LocalItem }) => {
    const lowStock = isLowStock(item);
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.itemCard, selectionMode && styles.itemCardSelectionMode, isSelected && styles.itemCardSelected]} 
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
        delayLongPress={500}
      >
      {selectionMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Check color="#fff" size={16} />}
          </View>
        </View>
      )}
      <View style={styles.itemImageContainer}>
        {item.local_photo_uri || item.photo_url ? (
          <Image
            source={{ uri: item.local_photo_uri || item.photo_url }}
            style={styles.itemImage}
          />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Package color="#9CA3AF" size={32} />
          </View>
        )}
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          {item.category && (
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.itemMeta}>
          {item.location_id && (
            <View style={styles.locationBadge}>
              <Text style={styles.locationText}>📍 {getLocationName(item.location_id)}</Text>
            </View>
          )}
          {item.barcode && (
            <Text style={styles.itemMetaText}>Barcode: {item.barcode}</Text>
          )}
          {item.container_id && (
            <Text style={styles.itemMetaText}>📦 Container</Text>
          )}
          {item.synced === 0 && (
            <View style={styles.unsyncedBadge}>
              <Text style={styles.unsyncedText}>Not Synced</Text>
            </View>
          )}
          {lowStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>⚠️ Low Stock</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quantity Controls */}
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={(e) => {
            e.stopPropagation();
            handleQuantityChange(item, -1);
          }}
        >
          <Minus color="#6B7280" size={16} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity || 1}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={(e) => {
            e.stopPropagation();
            handleQuantityChange(item, 1);
          }}
        >
          <Plus color="#6B7280" size={16} />
        </TouchableOpacity>
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#111827" size={24} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {searchQuery 
              ? `🔍 "${searchQuery}"`
              : lowStockFilter 
              ? '⚠️ Low Stock Items'
              : selectedLocation 
              ? `Items in ${locations.find(l => l.id === selectedLocation)?.name || 'Location'}` 
              : 'My Items'} ({items.length})
          </Text>
          {(selectedCategory || selectedLocation || searchQuery || lowStockFilter) && !selectionMode && (
            <TouchableOpacity
              onPress={handleClearAllFilters}
              style={styles.clearFiltersButton}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectionModeButton}>
          {selectionMode ? (
            <X color="#111827" size={20} />
          ) : (
            <Check color="#111827" size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#9CA3AF" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items by name, description, or barcode..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.searchClearButton}>
            <X color="#9CA3AF" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Low Stock Filter Toggle */}
      <View style={styles.lowStockFilterContainer}>
        <TouchableOpacity
          style={[styles.lowStockFilterButton, lowStockFilter && styles.lowStockFilterButtonActive]}
          onPress={handleToggleLowStockFilter}
        >
          <Text style={[styles.lowStockFilterText, lowStockFilter && styles.lowStockFilterTextActive]}>
            ⚠️ Low Stock Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryFilterChip,
              !selectedCategory && styles.categoryFilterChipActive,
            ]}
            onPress={() => handleCategoryFilter(null)}
          >
            <Filter color={!selectedCategory ? "#fff" : "#6B7280"} size={14} />
            <Text
              style={[
                styles.categoryFilterText,
                !selectedCategory && styles.categoryFilterTextActive,
              ]}
            >
              All ({allItems.length})
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryFilterChip,
                selectedCategory === category && styles.categoryFilterChipActive,
                { borderColor: getCategoryColor(category) },
              ]}
              onPress={() => handleCategoryFilter(category)}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  selectedCategory === category && styles.categoryFilterTextActive,
                ]}
              >
                {category} ({allItems.filter(i => i.category === category).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Location Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.locationFilter}
        contentContainerStyle={styles.locationFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.locationFilterChip,
            !selectedLocation && styles.locationFilterChipActive,
          ]}
          onPress={() => handleLocationFilter(null)}
        >
          <Package color={!selectedLocation ? "#fff" : "#6B7280"} size={14} />
          <Text
            style={[
              styles.locationFilterText,
              !selectedLocation && styles.locationFilterTextActive,
            ]}
          >
            All Locations
          </Text>
        </TouchableOpacity>
        {locations.map((location) => {
          const count = allItems.filter(i => i.location_id === location.id).length;
          return count > 0 ? (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.locationFilterChip,
                selectedLocation === location.id && styles.locationFilterChipActive,
              ]}
              onPress={() => handleLocationFilter(location.id)}
            >
              <Text
                style={[
                  styles.locationFilterText,
                  selectedLocation === location.id && styles.locationFilterTextActive,
                ]}
              >
                📍 {location.name} ({count})
              </Text>
            </TouchableOpacity>
          ) : null;
        })}
      </ScrollView>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.listContentEmpty : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Search color="#9ca3af" size={64} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No items found' : 'No items match your filters'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? `No results for "${searchQuery}"` 
                : 'Try adjusting your filters or add new items'}
            </Text>
          </View>
        }
      />

      {/* Bulk Action Bar */}
      {selectionMode && (
        <View style={styles.bulkActionBar}>
          <View style={styles.bulkActionHeader}>
            <View>
              <Text style={styles.bulkActionCount}>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </Text>
              <Text style={styles.bulkActionHint}>Long press to edit an item</Text>
            </View>
            <View style={styles.bulkActionButtons}>
              {selectedItems.size < items.length ? (
                <TouchableOpacity onPress={selectAllItems} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>Select All</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={deselectAllItems} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>Deselect All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.bulkActionsRow}>
            <TouchableOpacity
              style={[styles.bulkActionButton, selectedItems.size === 0 && styles.bulkActionButtonDisabled]}
              onPress={handleBulkAddToShopping}
              disabled={selectedItems.size === 0}
            >
              <ShoppingCart color={selectedItems.size === 0 ? "#9CA3AF" : "#1E40AF"} size={20} />
              <Text style={[styles.bulkActionButtonText, selectedItems.size === 0 && styles.bulkActionButtonTextDisabled]}>
                Add to Shopping
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, selectedItems.size === 0 && styles.bulkActionButtonDisabled]}
              onPress={handleBulkChangeLocation}
              disabled={selectedItems.size === 0}
            >
              <MapPin color={selectedItems.size === 0 ? "#9CA3AF" : "#059669"} size={20} />
              <Text style={[styles.bulkActionButtonText, selectedItems.size === 0 && styles.bulkActionButtonTextDisabled]}>
                Move
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, selectedItems.size === 0 && styles.bulkActionButtonDisabled]}
              onPress={handleBulkDelete}
              disabled={selectedItems.size === 0}
            >
              <Trash2 color={selectedItems.size === 0 ? "#9CA3AF" : "#DC2626"} size={20} />
              <Text style={[styles.bulkActionButtonText, selectedItems.size === 0 && styles.bulkActionButtonTextDisabled]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailScreen
          item={selectedItem}
          visible={showDetailModal}
          onClose={handleDetailClose}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}
    </View>
  );
}

// Helper function to get location name from id
const getLocationName = (locationId: string): string => {
  const locationMap: Record<string, string> = {
    'bedroom': 'Bedroom',
    'entertainment-room': 'Entertainment Room',
    'living-room': 'Living Room',
    'girls-room': 'Girls Room',
    'kitchen': 'Kitchen',
    'garage': 'Garage',
    'office': 'Office',
    'masters-bathroom': 'Masters Bathroom',
    'front-yard': 'Front Yard',
    'backyard': 'Backyard',
    'dining-room': 'Dining Room',
  };
  return locationMap[locationId] || locationId;
};

// Helper function to get category colors
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Beverage': '#3B82F6',
    'Snack': '#F59E0B',
    'Food': '#10B981',
    'Condiment': '#8B5CF6',
    'Breakfast': '#F97316',
    'Bakery': '#EC4899',
    'Produce': '#22C55E',
    'Protein': '#EF4444',
    'Dairy': '#06B6D4',
    'Frozen Food': '#6366F1',
    'Personal Care': '#A855F7',
    'Household': '#14B8A6',
    'Electronics': '#3B82F6',
    'Clothing': '#EC4899',
  };
  return colors[category] || '#6B7280';
};

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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  searchClearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  itemImageContainer: {
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    flexShrink: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 0,
  },
  categoryText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  locationBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unsyncedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unsyncedText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  lowStockBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  lowStockText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '700',
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
  quantityControls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  categoryFilter: {
    maxHeight: 50,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  categoryFilterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  clearFiltersButton: {
    paddingVertical: 2,
  },
  clearFiltersText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  locationFilter: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  locationFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  locationFilterChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  locationFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  locationFilterTextActive: {
    color: '#fff',
  },
  lowStockFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  lowStockFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  lowStockFilterButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#991B1B',
  },
  lowStockFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  lowStockFilterTextActive: {
    color: '#991B1B',
  },
  selectionModeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCardSelectionMode: {
    paddingLeft: 8,
  },
  itemCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  checkboxContainer: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bulkActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulkActionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  bulkActionHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  bulkActionButtonDisabled: {
    opacity: 0.5,
  },
  bulkActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  bulkActionButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
