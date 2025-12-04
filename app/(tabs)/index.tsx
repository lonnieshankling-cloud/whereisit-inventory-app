import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MobileShelfAnalyzer } from '../components/MobileShelfAnalyzer';
import AddItemScreen from '../screens/AddItemScreen';
import ContainerManagementScreen from '../screens/ContainerManagementScreen';
import ItemsListScreen from '../screens/ItemsListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import { databaseService } from '../services/databaseService';

function HomeScreenContent() {
  const [itemCount, setItemCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [containerCount, setContainerCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShelfAnalyzer, setShowShelfAnalyzer] = useState(false);
  const [showItemsList, setShowItemsList] = useState(false);
  const [showContainers, setShowContainers] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locationItemCounts, setLocationItemCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInitiated, setSearchInitiated] = useState(false);

  const handleAddItem = () => {
    setShowAddModal(true);
  };

  const handleShelfScan = () => {
    setShowShelfAnalyzer(true);
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
          photo: item.photoUri,
          synced: 0,
        });
      }
      
      Alert.alert('Success', `Added ${items.length} items with detailed descriptions!`);
      await loadStats();
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

  const handleLocationPress = (locationName: string) => {
    // Convert location name to ID
    const locationMap: Record<string, string> = {
      'Bedroom': 'bedroom',
      'Entertainment Room': 'entertainment-room',
      'Living Room': 'living-room',
      'Girls Room': 'girls-room',
      'Kitchen': 'kitchen',
      'Garage': 'garage',
      'Office': 'office',
      'Masters Bathroom': 'masters-bathroom',
      'Front Yard': 'front-yard',
      'Backyard': 'backyard',
      'Dining Room': 'dining-room',
    };
    setSelectedLocationId(locationMap[locationName] || null);
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
      const items = await databaseService.getAllItems();
      console.log('Items from database:', items.length);
      setItemCount(items.length);
      const unsynced = items.filter(item => !item.synced).length;
      setUnsyncedCount(unsynced);
      
      const containers = await databaseService.getAllContainers();
      setContainerCount(containers.length);

      // Calculate low stock items
      const lowStock = items.filter(item => {
        if (!item.min_quantity) return false;
        const quantity = item.quantity || 0;
        return quantity <= item.min_quantity;
      });
      setLowStockCount(lowStock.length);

      // Calculate item counts per location
      const counts: Record<string, number> = {};
      const locationIds = [
        'bedroom', 'entertainment-room', 'living-room', 'girls-room',
        'kitchen', 'garage', 'office', 'masters-bathroom',
        'front-yard', 'backyard', 'dining-room'
      ];
      
      for (const locationId of locationIds) {
        const locationItems = items.filter(item => item.location_id === locationId);
        counts[locationId] = locationItems.length;
      }
      setLocationItemCounts(counts);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        await databaseService.initialize();
        console.log('Database initialized successfully');
        await loadStats();
        console.log('Stats loaded');
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    initDatabase();
  }, []);

  // This is your data from the Leap app
  const locations = [
    "Bedroom",
    "Entertainment Room",
    "Living Room",
    "Girls Room",
    "Kitchen",
    "Garage",
    "Office",
    "Masters Bathroom",
    "Front Yard",
    "Backyard",
    "Dining Room"
  ];

  return (
    <View style={styles.container}>
      {/* Title Area */}
      <View style={styles.header}>
        <Text style={styles.title}>WhereIsIt?</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.scanButton} onPress={handleShelfScan}>
            <Text style={styles.scanButtonText}>📸 Scan Shelf</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            placeholder="Search items by name, barcode, or description..." 
            style={styles.searchBar}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearButton}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Row (like your web app) */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => setShowItemsList(true)}>
          <Text style={styles.statNumber}>{itemCount}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => setShowContainers(true)}>
          <Text style={styles.statNumber}>{containerCount}</Text>
          <Text style={styles.statLabel}>Containers</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{unsyncedCount}</Text>
          <Text style={styles.statLabel}>Unsynced</Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={styles.shoppingListButton}
          onPress={() => setShowShoppingList(true)}
        >
          <Text style={styles.shoppingListButtonText}>🛒 Shopping List</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Low Stock Alert Button */}
      {lowStockCount > 0 && (
        <TouchableOpacity
          style={styles.lowStockButton}
          onPress={() => {
            setShowItemsList(true);
            setSelectedLocationId('low-stock'); // Use special marker for low stock filter
          }}
        >
          <Text style={styles.lowStockButtonText}>⚠️ {lowStockCount} Low Stock Item{lowStockCount > 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Locations</Text>

      {/* List of Locations */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {locations.map((location, index) => {
          const locationId = location.toLowerCase().replace(/\s+/g, '-');
          const count = locationItemCounts[locationId] || 0;
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.card}
              onPress={() => handleLocationPress(location)}
            >
              <Text style={styles.cardText}>{location}</Text>
              {count > 0 && (
                <View style={styles.locationBadge}>
                  <Text style={styles.locationBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <AddItemScreen 
          onClose={() => setShowAddModal(false)}
          onItemAdded={handleItemAdded}
        />
      </Modal>

      {/* Shelf Analyzer Modal */}
      <MobileShelfAnalyzer
        visible={showShelfAnalyzer}
        onClose={() => setShowShelfAnalyzer(false)}
        onItemsDetected={handleItemsDetected}
      />

      {/* Items List Modal */}
      <Modal
        visible={showItemsList}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ItemsListScreen 
          onClose={() => {
            handleItemsListClose();
            if (searchInitiated) {
              setSearchQuery('');
              setSearchInitiated(false);
            }
          }}
          initialLocationFilter={selectedLocationId === 'low-stock' ? null : selectedLocationId}
          showLowStockOnly={selectedLocationId === 'low-stock'}
          initialSearchQuery={searchInitiated ? searchQuery : undefined}
        />
      </Modal>

      {/* Container Management Modal */}
      <Modal
        visible={showContainers}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ContainerManagementScreen onClose={() => setShowContainers(false)} />
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#000' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  scanButton: { backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  scanButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  addButton: { backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
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
    padding: 15, 
    fontSize: 16,
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
    fontSize: 16,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 15 },
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
  cardText: { fontSize: 16, fontWeight: '500', flex: 1 },
  locationBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 36,
    alignItems: 'center',
  },
  locationBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  shoppingListButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
  },
  shoppingListButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    padding: 16,
    borderRadius: 12,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  lowStockButton: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  lowStockButtonText: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default function HomeScreen() {
  return <HomeScreenContent />;
}