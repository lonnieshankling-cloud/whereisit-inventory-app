import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Camera, ClipboardList, Search as SearchIcon, ShoppingCart } from 'lucide-react-native';
import * as React from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { AnimatedButton } from '../../components/AnimatedButton';
import { DashboardSkeleton } from '../../components/DashboardSkeleton';
import { EnhancedModal } from '../../components/EnhancedModal';
import { MobileCamera } from '../../components/MobileCamera';
import { MobileShelfAnalyzer } from '../../components/MobileShelfAnalyzer';
import { databaseService, LocalContainer, LocalItem } from '../../services/databaseService';
import { ENTITLEMENT_ID, refreshPremiumStatus } from '../../utils/premium';
import AddItemScreen from '../screens/AddItemScreen';
import ContainerManagementScreen from '../screens/ContainerManagementScreen';
import ItemsListScreen from '../screens/ItemsListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';

function HomeScreenContent() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
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
  const [locations, setLocations] = React.useState<Array<{ id: string; name: string }>>(defaultLocations);
  const [lowStockCount, setLowStockCount] = React.useState(0);
  const [recentlyAddedItems, setRecentlyAddedItems] = React.useState<LocalItem[]>([]);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showShelfAnalyzer, setShowShelfAnalyzer] = React.useState(false);
  const [showItemsList, setShowItemsList] = React.useState(false);
  const [showContainers, setShowContainers] = React.useState(false);
  const [showShoppingList, setShowShoppingList] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(null);
  const [locationItemCounts, setLocationItemCounts] = React.useState<Record<string, number>>({});
  const [locationContainerCounts, setLocationContainerCounts] = React.useState<Record<string, number>>({});
  const [containersByLocation, setContainersByLocation] = React.useState<Record<string, LocalContainer[]>>({});
  const [containerItemCounts, setContainerItemCounts] = React.useState<Record<string, number>>({});
  const [containerItemsPreview, setContainerItemsPreview] = React.useState<Record<string, LocalItem[]>>({});
  const [expandedLocations, setExpandedLocations] = React.useState<Set<string>>(new Set());
  const [pendingAddContext, setPendingAddContext] = React.useState<{
    locationId: string | null;
    containerId: string | null;
    containerName?: string;
  } | null>(null);
  const [pendingContainerView, setPendingContainerView] = React.useState<{
    locationId: string | null;
    containerId: string;
    containerName?: string;
  } | null>(null);
  const [showAssignItemsModal, setShowAssignItemsModal] = React.useState(false);
  const [targetContainer, setTargetContainer] = React.useState<LocalContainer | null>(null);
  const [uncontainedItems, setUncontainedItems] = React.useState<LocalItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(new Set());
  const [showContainerDetailModal, setShowContainerDetailModal] = React.useState(false);
  const [selectedContainer, setSelectedContainer] = React.useState<LocalContainer | null>(null);
  const [containerDetailItems, setContainerDetailItems] = React.useState<LocalItem[]>([]);
  const [showContainerCamera, setShowContainerCamera] = React.useState(false);
  const [containerPhotoTarget, setContainerPhotoTarget] = React.useState<LocalContainer | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchInitiated, setSearchInitiated] = React.useState(false);
  const [showFabMenu, setShowFabMenu] = React.useState(false);
  const [showCreateLocationModal, setShowCreateLocationModal] = React.useState(false);
  const [newLocationName, setNewLocationName] = React.useState('');
  const [showCreateContainerModal, setShowCreateContainerModal] = React.useState(false);
  const [newContainerName, setNewContainerName] = React.useState('');
  const [newContainerLocation, setNewContainerLocation] = React.useState<string | null>(defaultLocations[0]?.id || null);
  const [isSavingQuickAdd, setIsSavingQuickAdd] = React.useState(false);

  const handleAddItem = () => {
    setShowFabMenu(false);
    setPendingAddContext(null);
    setShowAddModal(true);
  };

  const handleShelfScan = async () => {
    setShowFabMenu(false);
    try {
      const latestStatus = await refreshPremiumStatus();
      if (latestStatus.active) {
        setShowShelfAnalyzer(true);
        return;
      }

      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      console.log('[ShelfScan] Paywall result:', paywallResult);
      if (
        paywallResult === PAYWALL_RESULT.NOT_PRESENTED ||
        paywallResult === PAYWALL_RESULT.PURCHASED ||
        paywallResult === PAYWALL_RESULT.RESTORED
      ) {
        setShowShelfAnalyzer(true);
        return;
      }
      Alert.alert(
        'Upgrade Required',
        'Shelf scanning is a Pro feature. Please complete the upgrade to continue.'
      );
    } catch (e) {
      console.error('[ShelfScan] Paywall error:', e);
      Alert.alert(
        'Unable to Open Shelf Scanner',
        'We ran into a billing issue. Please try again, or open Settings → Upgrade to complete the purchase.'
      );
    }
  };

  const handleItemsDetected = async (items: Array<{
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
    receiptUri?: string;
  }>) => {
    try {
      // Batch create items with enhanced data
      for (const item of items) {
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Build comprehensive description from available data
        let fullDescription = item.description || '';
        if (item.extractedText && item.extractedText !== fullDescription) {
          fullDescription += fullDescription ? ` | Labels: ${item.extractedText}` : `Labels: ${item.extractedText}`;
        }
        if (item.category) {
          fullDescription += fullDescription ? ` | Category: ${item.category}` : `Category: ${item.category}`;
        }
        if (item.confidence) {
          fullDescription += fullDescription ? ` | Confidence: ${Math.round(item.confidence * 100)}%` : `Confidence: ${Math.round(item.confidence * 100)}%`;
        }
        
        await databaseService.createItem({
          id: itemId,
          name: item.brand ? `${item.brand} ${item.name}` : item.name,
          description: fullDescription || undefined,
          category: item.category,
          quantity: 1,
          container_id: item.containerId,
          location_id: item.locationId,
          local_photo_uri: item.photoUri,
          synced: 0,
        });

        // Create receipt if provided (one receipt per item from the shelf scan)
        if (item.receiptUri) {
          const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await databaseService.createReceipt({
            id: receiptId,
            item_id: itemId,
            local_photo_uri: item.receiptUri,
            synced: 0,
          });
        }
      }
      
      // Reload all data to ensure new containers and locations are visible
      await loadStats();
      
      const hasReceipt = items.some(item => item.receiptUri);
      Alert.alert(
        'Success', 
        hasReceipt 
          ? `Added ${items.length} items with receipt photo!`
          : `Added ${items.length} items with detailed descriptions!`
      );
    } catch (error) {
      console.error('Error saving detected items:', error);
      Alert.alert('Error', 'Failed to save some items');
    }
  };

  const handleItemAdded = async () => {
    setShowAddModal(false);
    await loadStats();
  };

  const handleItemsListClose = async () => {
    setShowItemsList(false);
    setSelectedLocationId(null);
    await loadStats();
  };

  const handleLocationPress = (locationId: string) => {
    setSelectedLocationId(locationId);
    setShowItemsList(true);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchInitiated(true);
      setShowItemsList(true);
    }
  };

  const handleSearchSubmit = () => {
    handleSearch();
  };

  const loadStats = async () => {
    try {
      console.log('Loading stats from database...');
      await databaseService.initialize();
      const items = await databaseService.getAllItems();
      const containers = await databaseService.getAllContainers();
      console.log('Items from database:', items.length);

      // Load locations dynamically
      const fetchedLocations = await databaseService.getAllLocations();
      const activeLocations = fetchedLocations.length > 0 ? fetchedLocations : defaultLocations;
      setLocations(activeLocations);

      // Get recently added items (last 5, sorted by creation date)
      const recentItems = items
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
      setRecentlyAddedItems(recentItems);

      // Calculate low stock items
      const lowStock = items.filter(item => {
        if (!item.min_quantity) return false;
        const quantity = item.quantity || 0;
        return quantity <= item.min_quantity;
      });
      setLowStockCount(lowStock.length);

      // Calculate item counts per location
      const counts: Record<string, number> = {};
      const containerCounts: Record<string, number> = {};
      const groupedContainers: Record<string, LocalContainer[]> = {};
      const containerItemCountMap: Record<string, number> = {};
      const containerItemsPreviewMap: Record<string, LocalItem[]> = {};

      for (const location of activeLocations) {
        const locationItems = items.filter(item => item.location_id === location.id);
        counts[location.id] = locationItems.length;

        const locationContainers = containers.filter(c => c.location_id === location.id);
        groupedContainers[location.id] = locationContainers;
        containerCounts[location.id] = locationContainers.length;

        for (const container of locationContainers) {
          const itemsInContainer = items.filter(item => item.container_id === container.id);
          containerItemCountMap[container.id] = itemsInContainer.length;
          containerItemsPreviewMap[container.id] = itemsInContainer.slice(0, 3);
        }
      }

      setLocationItemCounts(counts);
      setLocationContainerCounts(containerCounts);
      setContainersByLocation(groupedContainers);
      setContainerItemCounts(containerItemCountMap);
      setContainerItemsPreview(containerItemsPreviewMap);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  React.useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        await databaseService.initialize();
        console.log('Database initialized successfully');
        await loadStats();
        console.log('Stats loaded');
      } catch (error) {
        console.error('Error initializing database:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initDatabase();
  }, []);

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
      await loadStats();
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
      await loadStats();
      Alert.alert('Success', 'Container created');
    } catch (error) {
      console.error('Failed to create container:', error);
      Alert.alert('Error', 'Failed to create container');
    } finally {
      setIsSavingQuickAdd(false);
    }
  };

  const toggleLocationExpansion = (locationId: string) => {
    setExpandedLocations((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const handleAddContainerForLocation = (locationId: string) => {
    setNewContainerLocation(locationId);
    setShowCreateContainerModal(true);
  };

  const handleAddItemToContainer = (container: LocalContainer) => {
    Alert.alert(
      'Add Item',
      `Add to "${container.name}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create New Item',
          onPress: () => {
            setSelectedLocationId(container.location_id || null);
            setPendingAddContext({
              locationId: container.location_id || null,
              containerId: container.id,
              containerName: container.name,
            });
            setShowAddModal(true);
          },
        },
        {
          text: 'Assign Existing Item',
          onPress: () => handleOpenAssignItemsModal(container),
        },
      ]
    );
  };

  const handleOpenAssignItemsModal = async (container: LocalContainer) => {
    try {
      await databaseService.initialize();
      const allItems = await databaseService.getAllItems();
      const unassigned = allItems.filter(item => !item.container_id);
      setUncontainedItems(unassigned);
      setTargetContainer(container);
      setSelectedItemIds(new Set());
      setShowAssignItemsModal(true);
    } catch (error) {
      console.error('Failed to load uncontained items:', error);
      Alert.alert('Error', 'Failed to load items');
    }
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleAssignSelectedItems = async () => {
    if (selectedItemIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one item');
      return;
    }
    if (!targetContainer) return;

    try {
      for (const itemId of selectedItemIds) {
        await databaseService.updateItem(itemId, {
          container_id: targetContainer.id,
          location_id: targetContainer.location_id || undefined,
        });
      }
      setShowAssignItemsModal(false);
      setTargetContainer(null);
      setSelectedItemIds(new Set());
      await loadStats();
      Alert.alert('Success', `Assigned ${selectedItemIds.size} item(s) to "${targetContainer.name}"`);
    } catch (error) {
      console.error('Failed to assign items:', error);
      Alert.alert('Error', 'Failed to assign items');
    }
  };

  const handleContainerPress = async (container: LocalContainer) => {
    try {
      const items = await databaseService.getItemsByContainer(container.id);
      setContainerDetailItems(items);
      setSelectedContainer(container);
      setShowContainerDetailModal(true);
    } catch (error) {
      console.error('Failed to load container items:', error);
      Alert.alert('Error', 'Failed to load items');
    }
  };

  const handleAddPhotoToContainer = (container: LocalContainer) => {
    setContainerPhotoTarget(container);
    setShowContainerCamera(true);
  };

  const handleContainerPhotoTaken = async (uri: string) => {
    if (!containerPhotoTarget) return;
    try {
      await databaseService.updateContainer(containerPhotoTarget.id, {
        local_photo_uri: uri,
        synced: 0,
      });
      setShowContainerCamera(false);
      setContainerPhotoTarget(null);
      await loadStats();
      Alert.alert('Success', 'Container photo updated');
    } catch (error) {
      console.error('Failed to update container photo:', error);
      Alert.alert('Error', 'Failed to update photo');
    }
  };

  const handleViewItemsInContainer = (container: LocalContainer) => {
    setPendingContainerView({
      locationId: container.location_id || null,
      containerId: container.id,
      containerName: container.name,
    });
    setSelectedLocationId(container.location_id || null);
    setShowItemsList(true);
  };

  const handleDeleteContainer = async (container: LocalContainer) => {
    Alert.alert(
      'Delete Container',
      `Delete "${container.name}"? Items will be unassigned from this container.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const itemsInContainer = await databaseService.getItemsByContainer(container.id);
              for (const item of itemsInContainer) {
                await databaseService.updateItem(item.id, { container_id: undefined });
              }
              await databaseService.deleteContainer(container.id);
              await loadStats();
              Alert.alert('Deleted', 'Container removed');
            } catch (error) {
              console.error('Failed to delete container:', error);
              Alert.alert('Error', 'Failed to delete container');
            }
          },
        },
      ]
    );
  };

  const renderContainerCard = (container: LocalContainer) => {
    const itemsPreview = containerItemsPreview[container.id] || [];
    const totalItems = containerItemCounts[container.id] || 0;
    const hasMore = totalItems > itemsPreview.length;
    const hasPhoto = !!(container.local_photo_uri || container.photo_url);

    return (
          <TouchableOpacity 
        key={container.id} 
        style={styles.containerCard}
        onPress={() => handleContainerPress(container)}
        activeOpacity={0.7}
      >
        {/* Container Photo */}
        {hasPhoto ? (
          <Image 
            source={{ uri: container.local_photo_uri || container.photo_url }} 
            style={styles.containerPhoto}
            resizeMode="cover"
          />
        ) : (
          <TouchableOpacity 
            style={styles.containerPhotoPlaceholder}
            onPress={() => {
              handleAddPhotoToContainer(container);
            }}
          >
            <Text style={styles.containerPhotoPlaceholderText}>📷</Text>
            <Text style={styles.containerPhotoPlaceholderSubtext}>Add Photo</Text>
          </TouchableOpacity>
        )}

        <View style={styles.containerHeader}>
          <Text style={styles.containerTitle} numberOfLines={1}>{container.name}</Text>
          <View style={styles.containerHeaderRight}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{totalItems} items</Text>
            </View>
            <TouchableOpacity
              style={styles.kebabButton}
              onPress={() => {
                Alert.alert(
                  'Container actions',
                  container.name,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: hasPhoto ? 'Change Photo' : 'Add Photo',
                      onPress: () => handleAddPhotoToContainer(container),
                    },
                    {
                      text: 'View all items',
                      onPress: () => handleViewItemsInContainer(container),
                    },
                    {
                      text: 'Edit Container',
                      onPress: () => setShowContainers(true),
                    },
                    {
                      text: 'Delete Container',
                      style: 'destructive',
                      onPress: () => handleDeleteContainer(container),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.kebabIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>

        {itemsPreview.length === 0 ? (
          <Text style={styles.emptyItemsText}>No items yet</Text>
        ) : (
          <View style={styles.containerItemsList}>
            {itemsPreview.map((item: LocalItem) => (
              <View key={item.id} style={styles.containerItemRow}>
                {(item.local_photo_uri || item.photo_url) && (
                  <Image 
                    source={{ uri: item.local_photo_uri || item.photo_url }} 
                    style={styles.itemPhotoIcon}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.containerItemText} numberOfLines={1}>{item.name}</Text>
              </View>
            ))}
            {hasMore && (
              <Text style={styles.moreItemsText}>+ {totalItems - itemsPreview.length} more</Text>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={styles.addItemButton} 
          onPress={() => {
            handleAddItemToContainer(container);
          }}
        >
          <Text style={styles.addItemButtonText}>+ Add Item to this Container</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Title Area */}
      <View style={styles.header}>
        <Text style={styles.title}>WhereIsIt?</Text>
        <TouchableOpacity 
          onPress={() => router.push('/screens/SearchItemsScreen')}
          style={styles.headerSearchButton}
        >
          <SearchIcon color="#111827" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={styles.searchContainer}
        activeOpacity={0.9}
        onPress={() => router.push('/screens/SearchItemsScreen')}
      >
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={[styles.searchBar, { color: '#999', paddingTop: 14 }]}>
             Search items by name, barcode...
          </Text>
        </View>
      </TouchableOpacity>

      {/* Main scrollable content area containing Quick Actions, Recently Added, and Locations */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {/* Quick Actions Grid */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsGrid}
          >
            {/* Shelf Analyzer */}
            <AnimatedButton
              onPress={handleShelfScan}
              style={styles.quickActionCard}
            >
              <View style={styles.quickActionIconContainer}>
                <Camera color="#3B82F6" size={32} />
              </View>
              <Text style={styles.quickActionTitle} numberOfLines={2}>Shelf Analyzer</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>Scan shelves</Text>
            </AnimatedButton>

            {/* Projects */}
            <AnimatedButton
              onPress={() => router.push('/screens/ProjectsListScreen')}
              style={styles.quickActionCard}
            >
              <View style={styles.quickActionIconContainer}>
                <ClipboardList color="#3B82F6" size={32} />
              </View>
              <Text style={styles.quickActionTitle} numberOfLines={2}>Projects</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>Manage tasks</Text>
            </AnimatedButton>

            {/* Shopping List */}
            <AnimatedButton
              onPress={() => {
                setShowFabMenu(false);
                setShowShoppingList(true);
              }}
              style={styles.quickActionCard}
            >
              <View style={styles.quickActionIconContainer}>
                <ShoppingCart color="#3B82F6" size={32} />
              </View>
              <Text style={styles.quickActionTitle} numberOfLines={2}>Shopping List</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>View list</Text>
            </AnimatedButton>
          </ScrollView>
        </View>

        {/* Recently Added Items Section */}
        {recentlyAddedItems.length > 0 && (
          <View style={styles.recentlyAddedSection}>
            <View style={styles.recentlyAddedHeader}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <TouchableOpacity onPress={() => setShowItemsList(true)}>
                <Text style={styles.viewAllLink}>View all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              scrollEnabled={true}
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              data={recentlyAddedItems.slice(0, 10)}
              keyExtractor={(item: LocalItem) => item.id}
              contentContainerStyle={styles.recentlyAddedList}
              renderItem={({ item }: { item: LocalItem }) => {
                const location = locations.find((l: { id: string; name: string }) => l.id === item.location_id);
                return (
                  <TouchableOpacity
                    style={styles.recentlyAddedItem}
                    onPress={() => {
                      setSelectedLocationId(item.location_id || null);
                      setShowItemsList(true);
                    }}
                  >
                    {(item.local_photo_uri || item.photo_url) && (
                      <Image
                        source={{ uri: item.local_photo_uri || item.photo_url }}
                        style={styles.recentlyAddedItemPhoto}
                      />
                    )}
                    {!item.local_photo_uri && !item.photo_url && (
                      <View style={styles.recentlyAddedItemPhotoPlaceholder}>
                        <Text style={styles.photoPlaceholderEmoji}>📦</Text>
                      </View>
                    )}
                    <Text style={styles.recentlyAddedItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.recentlyAddedItemLocation} numberOfLines={1}>
                      {location?.name || 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Locations</Text>

        {/* List of Locations with expandable containers */}
        {locations.map((location: { id: string; name: string }) => {
          const itemCount = locationItemCounts[location.id] || 0;
          const containerCount = locationContainerCounts[location.id] || 0;
          const isExpanded = expandedLocations.has(location.id);
          const locationContainers = containersByLocation[location.id] || [];

          return (
            <View key={location.id} style={styles.locationCard}>
              <View style={styles.locationHeaderRow}>
                <TouchableOpacity style={styles.locationMain} onPress={() => handleLocationPress(location.id)}>
                  <Text style={styles.locationTitle}>{location.name}</Text>
                  <View style={styles.locationCountsRow}>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{containerCount} containers</Text>
                    </View>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{itemCount} items</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.locationActions}>
                  <TouchableOpacity onPress={() => handleAddContainerForLocation(location.id)}>
                    <Text style={styles.addContainerText}>+ Container</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.expandButton} onPress={() => toggleLocationExpansion(location.id)}>
                    <Text style={styles.expandIcon}>{isExpanded ? '⌃' : '⌄'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.containerSection}>
                  {locationContainers.length === 0 ? (
                    <Text style={styles.emptyContainersText}>No containers yet</Text>
                  ) : (
                    locationContainers.map((c: LocalContainer) => renderContainerCard(c))
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Item Modal */}
      <EnhancedModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        animationType="slideUp"
      >
        <AddItemScreen 
          onClose={() => {
            setShowAddModal(false);
            setPendingAddContext(null);
          }}
          onItemAdded={handleItemAdded}
          initialLocationId={pendingAddContext?.locationId || undefined}
          initialContainerId={pendingAddContext?.containerId || undefined}
          initialContainerName={pendingAddContext?.containerName}
        />
      </EnhancedModal>

      {/* Shelf Analyzer Modal */}
      <MobileShelfAnalyzer
        visible={showShelfAnalyzer}
        onClose={() => setShowShelfAnalyzer(false)}
        onItemsDetected={handleItemsDetected}
      />

      {/* Items List Modal */}
      <EnhancedModal
        visible={showItemsList}
        onClose={() => {
          setPendingContainerView(null);
          handleItemsListClose();
          if (searchInitiated) {
            setSearchQuery('');
            setSearchInitiated(false);
          }
        }}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ItemsListScreen 
          initialLocationFilter={pendingContainerView?.locationId ?? (selectedLocationId === 'low-stock' ? null : selectedLocationId)}
          initialContainerId={pendingContainerView?.containerId}
          initialContainerName={pendingContainerView?.containerName}
          initialSearchQuery={searchInitiated ? searchQuery : undefined}
          onClose={() => {
            setPendingContainerView(null);
            handleItemsListClose();
            if (searchInitiated) {
              setSearchQuery('');
              setSearchInitiated(false);
            }
          }}
          onAddItem={handleAddItem}
          onScanShelf={handleShelfScan}
          onOpenShoppingList={() => setShowShoppingList(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </EnhancedModal>

      {/* Container Management Modal */}
      <EnhancedModal
        visible={showContainers}
        onClose={() => setShowContainers(false)}
        animationType="slideUp"
      >
        <ContainerManagementScreen onClose={() => setShowContainers(false)} />
      </EnhancedModal>

      {/* Shopping List Modal */}
      <ShoppingListScreen
        visible={showShoppingList}
        onClose={() => setShowShoppingList(false)}
      />

      {/* Settings Modal */}
      <SettingsScreen
        visible={showSettings}
        onClose={() => {
          setShowSettings(false);
          loadStats(); // Reload stats in case premium status changed
        }}
      />

      {/* Floating Action Button */}
      {showFabMenu && (
        <TouchableOpacity 
          style={styles.fabOverlay} 
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        >
          <View style={styles.fabMenuContainer}>
            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                setShowSettings(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Text style={styles.fabMenuIcon}>⚙️</Text>
              </View>
              <Text style={styles.fabMenuLabel}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                setShowShoppingList(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Text style={styles.fabMenuIcon}>🛒</Text>
              </View>
              <Text style={styles.fabMenuLabel}>Shopping List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={handleShelfScan}
            >
              <View style={styles.fabMenuButton}>
                <Text style={styles.fabMenuIcon}>📸</Text>
              </View>
              <Text style={styles.fabMenuLabel}>Scan Shelf</Text>
            </TouchableOpacity>
            
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
            
            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={handleAddItem}
            >
              <View style={styles.fabMenuButton}>
                <Text style={styles.fabMenuIcon}>+</Text>
              </View>
              <Text style={styles.fabMenuLabel}>Add Item</Text>
            </TouchableOpacity>
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
                <Text style={styles.quickModalClose}>✕</Text>
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
                <Text style={styles.quickModalClose}>✕</Text>
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
              {locations.map((location: { id: string; name: string }) => (
                <TouchableOpacity
                  key={location.id}
                  style={[styles.locationOption, newContainerLocation === location.id && styles.locationOptionSelected]}
                  onPress={() => setNewContainerLocation(location.id)}
                >
                  <Text style={[styles.locationOptionText, newContainerLocation === location.id && styles.locationOptionTextSelected]}>
                    {location.name}
                  </Text>
                  {newContainerLocation === location.id && <Text style={styles.checkmark}>✓</Text>}
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

      {/* Assign Existing Items Modal */}
      <Modal visible={showAssignItemsModal} transparent animationType="slide">
        <View style={styles.quickModalOverlay}>
          <View style={[styles.quickModalContent, { maxHeight: '80%' }]}>
            <View style={styles.quickModalHeader}>
              <Text style={styles.quickModalTitle}>
                Assign Items to {targetContainer?.name}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAssignItemsModal(false);
                setTargetContainer(null);
                setSelectedItemIds(new Set());
              }}>
                <Text style={styles.quickModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {uncontainedItems.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={styles.quickModalEmptyText}>
                  No unassigned items available.
                </Text>
                <Text style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
                  All items are already in containers or you can create a new item.
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                  Select items to assign ({selectedItemIds.size} selected)
                </Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  {uncontainedItems.map((item: LocalItem) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.itemSelectionRow,
                        selectedItemIds.has(item.id) && styles.itemSelectionRowSelected
                      ]}
                      onPress={() => handleToggleItemSelection(item.id)}
                    >
                      <View style={styles.itemSelectionCheckbox}>
                        {selectedItemIds.has(item.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemSelectionName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.description && (
                          <Text style={styles.itemSelectionDescription} numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                        {item.location_name && (
                          <Text style={styles.itemSelectionLocation}>
                            📍 {item.location_name}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { marginTop: 16 },
                    selectedItemIds.size === 0 && styles.primaryButtonDisabled
                  ]}
                  onPress={handleAssignSelectedItems}
                  disabled={selectedItemIds.size === 0}
                >
                  <Text style={styles.primaryButtonText}>
                    Assign {selectedItemIds.size} Item{selectedItemIds.size !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Container Detail Modal */}
      <Modal visible={showContainerDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.detailModalContainer}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowContainerDetailModal(false);
              setSelectedContainer(null);
            }}>
              <Text style={styles.detailModalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.detailModalTitle}>{selectedContainer?.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedContainer && (selectedContainer.local_photo_uri || selectedContainer.photo_url) && (
            <Image 
              source={{ uri: selectedContainer.local_photo_uri || selectedContainer.photo_url }} 
              style={styles.detailModalPhoto}
              resizeMode="cover"
            />
          )}

          {containerDetailItems.length === 0 ? (
            <View style={styles.detailModalEmpty}>
              <Text style={styles.detailModalEmptyText}>No items in this container</Text>
            </View>
          ) : (
            <FlatList
              data={containerDetailItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.detailModalList}
              renderItem={({ item }) => (
                <View style={styles.detailModalItem}>
                  {(item.local_photo_uri || item.photo_url) && (
                    <Image 
                      source={{ uri: item.local_photo_uri || item.photo_url }} 
                      style={styles.detailModalItemPhoto}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.detailModalItemInfo}>
                    <Text style={styles.detailModalItemName}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.detailModalItemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    {item.quantity && (
                      <Text style={styles.detailModalItemQuantity}>Qty: {item.quantity}</Text>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Container Camera Modal */}
      <MobileCamera 
        visible={showContainerCamera}
        onClose={() => {
          setShowContainerCamera(false);
          setContainerPhotoTarget(null);
        }}
        onImageCaptured={handleContainerPhotoTaken}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  headerSearchButton: { padding: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchBar: { 
    flex: 1,
    padding: 12, 
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  searchClearButton: {
    padding: 8,
  },
  searchClearText: {
    fontSize: 18,
    color: '#999',
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, lineHeight: 24 },
  listContent: { paddingBottom: 40 },
  card: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardText: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20, letterSpacing: 0.2, flexWrap: 'wrap' },
  locationBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 32,
    alignItems: 'center',
  },
  locationBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationMain: {
    flex: 1,
    gap: 6,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  locationCountsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  countPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addContainerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  expandButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  expandIcon: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '800',
  },
  containerSection: {
    marginTop: 12,
    gap: 10,
  },
  emptyContainersText: {
    fontSize: 13,
    color: '#6B7280',
  },
  containerCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  containerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  containerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  containerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  kebabButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kebabIcon: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '700',
  },
  containerItemsList: {
    gap: 6,
  },
  containerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  containerItemText: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  containerPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  containerPhotoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  containerPhotoPlaceholderText: {
    fontSize: 32,
    marginBottom: 4,
  },
  containerPhotoPlaceholderSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  itemPhotoIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailModalClose: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '600',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailModalPhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  detailModalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  detailModalEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailModalList: {
    padding: 16,
  },
  detailModalItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailModalItemPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  detailModalItemInfo: {
    flex: 1,
  },
  detailModalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  detailModalItemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailModalItemQuantity: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#6B7280',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  addItemButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addItemButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
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
    paddingRight: 24,
    paddingBottom: 100,
  },
  fabMenuContainer: {
    gap: 16,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabMenuLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuIcon: {
    fontSize: 24,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  quickModalClose: {
    fontSize: 22,
    fontWeight: '400',
    color: '#6B7280',
  },
  quickModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  quickModalLabel: {
    fontSize: 13,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  locationOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  locationOptionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  locationOptionTextSelected: {
    color: '#1E3A8A',
  },
  checkmark: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '700',
  },
  quickModalEmptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  itemSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  itemSelectionRowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  itemSelectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemSelectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemSelectionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemSelectionLocation: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  quickActionsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionCard: {
    width: 140, // Fixed width
    height: 140, // Fixed height for square look
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3B82F6',
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  recentlyAddedSection: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  recentlyAddedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  recentlyAddedList: {
    paddingHorizontal: 16,
    paddingRight: 16,
    gap: 12,
  },
  recentlyAddedItem: {
    width: 110,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  recentlyAddedItemPhoto: {
    width: '100%',
    height: 90,
    backgroundColor: '#F3F4F6',
  },
  recentlyAddedItemPhotoPlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderEmoji: {
    fontSize: 36,
  },
  recentlyAddedItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 8,
    paddingTop: 10,
    marginBottom: 4,
  },
  recentlyAddedItemLocation: {
    fontSize: 11,
    color: '#9CA3AF',
    paddingHorizontal: 8,
  },
});

export default function HomeScreen() {
  return <HomeScreenContent />;
}