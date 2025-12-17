import { logItemViewed, logSearchPerformed } from '@/utils/analytics';
import { Check, Filter, MapPin, Minus, Package, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { databaseService, LocalContainer, LocalItem } from '../../services/databaseService';
import { ShoppingListService } from '../../services/shoppingListService';
import ItemDetailScreen from './ItemDetailScreen';

interface ItemsListScreenProps {
  onClose?: () => void;
  initialLocationFilter?: string | null;
  initialContainerId?: string;
  initialContainerName?: string;
  initialSearchQuery?: string;
  onAddItem?: () => void;
  onScanShelf?: () => void;
  onOpenShoppingList?: () => void;
  onOpenSettings?: () => void;
}

export default function ItemsListScreen({ onClose, initialLocationFilter, initialContainerId, initialContainerName, initialSearchQuery, onAddItem, onScanShelf, onOpenShoppingList, onOpenSettings }: ItemsListScreenProps) {
  const defaultLocations: Array<{ id: string; name: string }> = [
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
  ];

  const [items, setItems] = useState<LocalItem[]>([]);
  const [allItems, setAllItems] = useState<LocalItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LocalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(initialLocationFilter || null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(initialContainerId || null);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [containerMap, setContainerMap] = useState<Record<string, string>>({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const shoppingListService = useRef(new ShoppingListService()).current;
  const [locations, setLocations] = useState<Array<{id: string, name: string}>>(defaultLocations);
  const [showCreateLocationModal, setShowCreateLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [showCreateContainerModal, setShowCreateContainerModal] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerLocation, setNewContainerLocation] = useState<string | null>(null);
  const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if ((initialLocationFilter || initialContainerId) && allItems.length > 0) {
      filterItems(allItems, selectedCategory, initialLocationFilter || null, initialContainerId || null, searchQuery);
    }
  }, [initialLocationFilter, initialContainerId, allItems]);

  useEffect(() => {
    if (initialSearchQuery && allItems.length > 0) {
      filterItems(allItems, selectedCategory, selectedLocation, selectedContainer, initialSearchQuery);
    }
  }, [initialSearchQuery, allItems]);

  const loadItems = async () => {
    try {
      await databaseService.initialize();
      const fetchedLocations = await databaseService.getAllLocations();
      const activeLocations = fetchedLocations.length > 0 ? fetchedLocations : defaultLocations;
      setLocations(activeLocations);
      if (!newContainerLocation && activeLocations.length > 0) {
        setNewContainerLocation(activeLocations[0].id);
      }
      const fetchedItems = await databaseService.getAllItems();
      const containers: LocalContainer[] = await databaseService.getAllContainers();
      const map = Object.fromEntries(containers.map(c => [c.id, c.name]));
      setContainerMap(map);

      const itemsWithContainerName = fetchedItems.map(item => ({
        ...item,
        container_name: item.container_name || (item.container_id ? map[item.container_id] : undefined),
      }));

      setAllItems(itemsWithContainerName);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(fetchedItems.map(item => item.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories.sort());
      
      // Apply filter
      filterItems(itemsWithContainerName, selectedCategory, selectedLocation, selectedContainer, searchQuery);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const slugifyId = (name: string, prefix: string) => {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return base || `${prefix}_${Date.now()}`;
  };

  const handleQuickCreateLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    try {
      setIsSavingQuickAdd(true);
      await databaseService.initialize();
      const id = slugifyId(newLocationName, 'location');
      await databaseService.createLocation({ id, name: newLocationName.trim() });
      setShowCreateLocationModal(false);
      setNewLocationName('');
      await loadItems();
      Alert.alert('Success', 'Location created');
    } catch (error) {
      console.error('Failed to create location:', error);
      Alert.alert('Error', 'Failed to create location');
    } finally {
      setIsSavingQuickAdd(false);
    }
  };

  const handleQuickCreateContainer = async () => {
    if (!newContainerName.trim()) {
      Alert.alert('Error', 'Please enter a container name');
      return;
    }
    if (!newContainerLocation) {
      Alert.alert('Error', 'Please select a location for this container');
      return;
    }

    try {
      setIsSavingQuickAdd(true);
      await databaseService.initialize();
      const containerId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await databaseService.createContainer({
        id: containerId,
        name: newContainerName.trim(),
        location_id: newContainerLocation,
        synced: 0,
        local_photo_uri: undefined,
      });
      setShowCreateContainerModal(false);
      setNewContainerName('');
      setNewContainerLocation(locations[0]?.id || null);
      await loadItems();
      Alert.alert('Success', 'Container created');
    } catch (error) {
      console.error('Failed to create container:', error);
      Alert.alert('Error', 'Failed to create container');
    } finally {
      setIsSavingQuickAdd(false);
    }
  };

  const filterItems = (itemsList: LocalItem[], category: string | null, location: string | null, container: string | null, search: string, lowStock?: boolean) => {
    let filtered = itemsList;
    
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (location) {
      filtered = filtered.filter(item => item.location_id === location);
    }

    if (container) {
      filtered = filtered.filter(item => item.container_id === container);
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
    filterItems(allItems, category, selectedLocation, selectedContainer, searchQuery);
  };

  const handleLocationFilter = (location: string | null) => {
    setSelectedLocation(location);
    setSelectedContainer(null);
    filterItems(allItems, selectedCategory, location, null, searchQuery);
  };

  const handleContainerFilter = (container: string | null) => {
    setSelectedContainer(container);
    filterItems(allItems, selectedCategory, selectedLocation, container, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Debounce search to avoid filtering on every keystroke
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      filterItems(allItems, selectedCategory, selectedLocation, selectedContainer, query);
      
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
    filterItems(allItems, selectedCategory, selectedLocation, selectedContainer, '');
  };

  const handleToggleLowStockFilter = () => {
    const newValue = !lowStockFilter;
    setLowStockFilter(newValue);
    filterItems(allItems, selectedCategory, selectedLocation, selectedContainer, searchQuery, newValue);
  };

  const handleClearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedLocation(null);
    setSelectedContainer(null);
    setSearchQuery('');
    setLowStockFilter(false);
    filterItems(allItems, null, null, null, '', false);
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
      await logItemViewed(item.id);
      setSelectedItem(item);
      setShowDetailModal(true);
    }
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
  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedItems(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
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
          {item.container_name && (
            <Text style={styles.itemMetaText}>📦 {item.container_name}</Text>
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
      {/* Fixed Header Section */}
      <View style={styles.fixedHeaderSection}>
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
                : selectedContainer
                ? `Items in ${containerMap[selectedContainer] || 'Container'}`
                : selectedLocation 
                ? `Items in ${locations.find(l => l.id === selectedLocation)?.name || 'Location'}` 
                : 'My Items'} ({items.length})
            </Text>
            {(selectedCategory || selectedLocation || selectedContainer || searchQuery || lowStockFilter) && !selectionMode && (
              <TouchableOpacity
                onPress={handleClearAllFilters}
                style={styles.clearFiltersButton}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
              <Filter color="#111827" size={20} />
              {(selectedCategory || selectedLocation || selectedContainer || lowStockFilter) && (
                <View style={styles.filterBadge} />
              )}
            </TouchableOpacity>
            {selectionMode ? (
              <TouchableOpacity onPress={exitSelectionMode} style={styles.selectionModeButton}>
                <Text style={styles.selectionModeText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={enterSelectionMode} style={styles.selectionModeButton}>
                <Text style={styles.selectionModeText}>Select</Text>
              </TouchableOpacity>
            )}
          </View>
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
      </View>

      {/* Scrollable List Section */}
      <FlatList
        style={{ flex: 1 }}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        nestedScrollEnabled={true}
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
              <Text style={styles.bulkActionHint}>Tap items to select • Tap X to exit</Text>
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

      {/* Floating Action Button */}
      {showFabMenu && (
        <TouchableOpacity 
          style={styles.fabOverlay} 
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        >
          <View style={styles.fabMenuContainer}>
            {onOpenSettings && (
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  onOpenSettings();
                }}
              >
                <View style={styles.fabMenuButton}>
                  <Text style={styles.fabMenuIcon}>⚙️</Text>
                </View>
                <Text style={styles.fabMenuLabel}>Settings</Text>
              </TouchableOpacity>
            )}

            {onOpenShoppingList && (
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  onOpenShoppingList();
                }}
              >
                <View style={styles.fabMenuButton}>
                  <Text style={styles.fabMenuIcon}>🛒</Text>
                </View>
                <Text style={styles.fabMenuLabel}>Shopping List</Text>
              </TouchableOpacity>
            )}
            
            {onScanShelf && (
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  onScanShelf();
                }}
              >
                <View style={styles.fabMenuButton}>
                  <Text style={styles.fabMenuIcon}>📸</Text>
                </View>
                <Text style={styles.fabMenuLabel}>Scan Shelf</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                setShowCreateLocationModal(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Text style={styles.fabMenuIcon}>📍</Text>
              </View>
              <Text style={styles.fabMenuLabel}>Add Location</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                if (locations.length > 0) {
                  setNewContainerLocation(locations[0].id);
                }
                setShowCreateContainerModal(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Text style={styles.fabMenuIcon}>📦</Text>
              </View>
              <Text style={styles.fabMenuLabel}>Add Container</Text>
            </TouchableOpacity>
            
            {onAddItem && (
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  onAddItem();
                }}
              >
                <View style={styles.fabMenuButton}>
                  <Text style={styles.fabMenuIcon}>+</Text>
                </View>
                <Text style={styles.fabMenuLabel}>Add Item</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowFabMenu(!showFabMenu)}
      >
        <Text style={styles.fabIcon}>{showFabMenu ? '✕' : '+'}</Text>
      </TouchableOpacity>

      {/* Quick Create Location Modal */}
      <Modal visible={showCreateLocationModal} transparent animationType="slide">
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalContent}>
            <View style={styles.quickModalHeader}>
              <Text style={styles.quickModalTitle}>Add Location</Text>
              <TouchableOpacity onPress={() => setShowCreateLocationModal(false)}>
                <X color="#111827" size={22} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.quickModalInput}
              placeholder="Location name"
              value={newLocationName}
              onChangeText={setNewLocationName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, isSavingQuickAdd && styles.primaryButtonDisabled]}
              onPress={handleQuickCreateLocation}
              disabled={isSavingQuickAdd}
            >
              <Text style={styles.primaryButtonText}>{isSavingQuickAdd ? 'Saving...' : 'Save Location'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Create Container Modal */}
      <Modal visible={showCreateContainerModal} transparent animationType="slide">
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalContent}>
            <View style={styles.quickModalHeader}>
              <Text style={styles.quickModalTitle}>Add Container</Text>
              <TouchableOpacity onPress={() => setShowCreateContainerModal(false)}>
                <X color="#111827" size={22} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.quickModalInput}
              placeholder="Container name"
              value={newContainerName}
              onChangeText={setNewContainerName}
              autoFocus
            />
            <Text style={styles.quickModalLabel}>Assign to location</Text>
            <ScrollView style={styles.quickModalList}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[styles.locationOption, newContainerLocation === location.id && styles.locationOptionSelected]}
                  onPress={() => setNewContainerLocation(location.id)}
                >
                  <Text style={[styles.locationOptionText, newContainerLocation === location.id && styles.locationOptionTextSelected]}>
                    {location.name}
                  </Text>
                  {newContainerLocation === location.id && <Check color="#2563EB" size={18} />}
                </TouchableOpacity>
              ))}
              {locations.length === 0 && (
                <Text style={styles.quickModalEmptyText}>Add a location first to place this container.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.primaryButton, (!newContainerLocation || isSavingQuickAdd) && styles.primaryButtonDisabled]}
              onPress={handleQuickCreateContainer}
              disabled={!newContainerLocation || isSavingQuickAdd}
            >
              <Text style={styles.primaryButtonText}>{isSavingQuickAdd ? 'Saving...' : 'Save Container'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.filterModalContainer}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalContent}>
            {/* Category Filter Section */}
            {categories.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !selectedCategory && styles.filterOptionSelected,
                  ]}
                  onPress={() => handleCategoryFilter(null)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    !selectedCategory && styles.filterOptionTextSelected,
                  ]}>
                    All Categories ({allItems.length})
                  </Text>
                  {!selectedCategory && <Check color="#3B82F6" size={20} />}
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterOption,
                      selectedCategory === category && styles.filterOptionSelected,
                    ]}
                    onPress={() => {
                      handleCategoryFilter(category);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedCategory === category && styles.filterOptionTextSelected,
                    ]}>
                      {category} ({allItems.filter(i => i.category === category).length})
                    </Text>
                    {selectedCategory === category && <Check color="#3B82F6" size={20} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Location Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !selectedLocation && styles.filterOptionSelected,
                ]}
                onPress={() => handleLocationFilter(null)}
              >
                <Text style={[
                  styles.filterOptionText,
                  !selectedLocation && styles.filterOptionTextSelected,
                ]}>
                  All Locations
                </Text>
                {!selectedLocation && <Check color="#3B82F6" size={20} />}
              </TouchableOpacity>
              {locations.map((location) => {
                const count = allItems.filter(i => i.location_id === location.id).length;
                return (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.filterOption,
                      selectedLocation === location.id && styles.filterOptionSelected,
                    ]}
                    onPress={() => {
                      handleLocationFilter(location.id);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedLocation === location.id && styles.filterOptionTextSelected,
                    ]}>
                      📍 {location.name} ({count})
                    </Text>
                    {selectedLocation === location.id && <Check color="#3B82F6" size={20} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Low Stock Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Stock Level</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  lowStockFilter && styles.filterOptionSelected,
                ]}
                onPress={handleToggleLowStockFilter}
              >
                <Text style={[
                  styles.filterOptionText,
                  lowStockFilter && styles.filterOptionTextSelected,
                ]}>
                  ⚠️ Low Stock Only
                </Text>
                {lowStockFilter && <Check color="#3B82F6" size={20} />}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity
              style={styles.filterClearButton}
              onPress={() => {
                handleClearAllFilters();
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.filterClearButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.filterApplyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    display: 'flex',
    flexDirection: 'column',
  },
  fixedHeaderSection: {
    backgroundColor: 'white',
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
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImageContainer: {
    marginRight: 10,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  itemImagePlaceholder: {
    width: 70,
    height: 70,
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
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  locationBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  locationText: {
    fontSize: 12,
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
    fontSize: 13,
    color: '#6B7280',
  },
  unsyncedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unsyncedText: {
    fontSize: 12,
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
    fontSize: 13,
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
    fontSize: 16,
    color: '#6B7280',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 32,
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
    paddingVertical: 12,
    gap: 10,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryFilterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
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
    fontSize: 13,
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
    paddingVertical: 12,
    gap: 10,
  },
  locationFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  locationFilterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  locationFilterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  locationFilterTextActive: {
    color: '#fff',
  },
  selectionModeButton: {
    minWidth: 64,
    height: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  selectionModeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bulkActionHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minHeight: 44,
    justifyContent: 'center',
  },
  selectAllText: {
    fontSize: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 6,
    minHeight: 64,
  },
  bulkActionButtonDisabled: {
    opacity: 0.5,
  },
  bulkActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  bulkActionButtonTextDisabled: {
    color: '#9CA3AF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  filterButton: {
    padding: 12,
    position: 'relative',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  filterModalContent: {
    flex: 1,
  },
  filterSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    minHeight: 56,
  },
  filterOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  filterClearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  filterApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  quickModalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  quickModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  quickModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 48,
  },
  quickModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  quickModalList: {
    maxHeight: 200,
    marginVertical: 8,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    minHeight: 48,
  },
  locationOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  locationOptionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  locationOptionTextSelected: {
    color: '#3B82F6',
  },
  quickModalEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 90,
  },
  fabMenuContainer: {
    backgroundColor: 'transparent',
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabMenuButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuIcon: {
    fontSize: 28,
  },
  fabMenuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
