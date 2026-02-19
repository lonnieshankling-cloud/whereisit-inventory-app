import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { databaseService, LocalItem } from '../../services/databaseService';
import ItemDetailScreen from './ItemDetailScreen';

interface SearchItemsScreenProps {
  onClose?: () => void;
}

export default function SearchItemsScreen({ onClose }: SearchItemsScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<LocalItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LocalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<LocalItem | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await databaseService.initialize();
        const items = await databaseService.getAllItems();
        setAllItems(items);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(items.map(i => i.category).filter(Boolean) as string[])
        ).sort();
        setCategories(uniqueCategories);
        
        setFilteredItems(items);
      } catch (error) {
        console.error('Failed to load items for search:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Filter items
  useEffect(() => {
    let result = allItems;

    if (debouncedQuery.trim()) {
      const lowerQuery = debouncedQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        (item.description && item.description.toLowerCase().includes(lowerQuery))
      );
    }

    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(result);
  }, [debouncedQuery, selectedCategory, allItems]);

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    Keyboard.dismiss();
  };

  const renderItem = ({ item }: { item: LocalItem }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => setSelectedItem(item)}
    >
      <View style={styles.itemImageContainer}>
        {item.local_photo_uri ? (
          <Image source={{ uri: item.local_photo_uri }} style={styles.itemImage} />
        ) : item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Search color="#9CA3AF" size={20} />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemMeta}>
          {item.location_name && (
            <Text style={styles.itemLocation} numberOfLines={1}>
               📍 {item.location_name}
            </Text>
          )}
          {item.category && (
            <Text style={styles.itemCategory} numberOfLines={1}>
              {item.location_name ? ' • ' : ''}{item.category}
            </Text>
          )}
        </View>
        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : 0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBarContainer}>
          <Search color="#6B7280" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, descriptions..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <X color="#6B7280" size={16} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['All', ...categories]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = (item === 'All' && !selectedCategory) || item === selectedCategory;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryPill,
                    isSelected && styles.categoryPillSelected
                  ]}
                  onPress={() => setSelectedCategory(item === 'All' ? null : item)}
                >
                  <Text style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Search color="#D1D5DB" size={48} />
              <Text style={styles.emptyText}>
                {query ? 'No items found matching your search' : 'Start typing to search your inventory'}
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled" 
          onScrollBeginDrag={Keyboard.dismiss}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailScreen
          visible={true}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={() => {
            setSelectedItem(null);
            // Refresh list
            databaseService.getAllItems().then(setAllItems);
          }}
          onItemDeleted={() => {
            setSelectedItem(null);
             // Refresh list
            databaseService.getAllItems().then(setAllItems);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#0a7ea4',
  },
  categoryText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  resultsList: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#F9FAFB',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLocation: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  itemCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
});
