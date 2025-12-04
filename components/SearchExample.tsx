/**
 * Example Integration: Search Screen
 * Shows how to track search analytics
 */

import { logItemViewed, logSearchPerformed } from '@/utils/analytics';
import { Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Item {
  id: string;
  name: string;
  category: string;
  location: string;
}

export default function SearchExample() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);

  // Mock data - replace with your actual data
  const allItems: Item[] = [
    { id: '1', name: 'Hammer', category: 'Tools', location: 'Garage' },
    { id: '2', name: 'Screwdriver', category: 'Tools', location: 'Garage' },
    { id: '3', name: 'Paint Brush', category: 'Art', location: 'Studio' },
  ];

  // Debounced search with analytics
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 0) {
        performSearch(searchQuery);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    // Your actual search logic here
    const filtered = allItems.filter(
      item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.location.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered);

    // 📊 Track search event with result count
    await logSearchPerformed(query, filtered.length);
  };

  const handleItemPress = async (item: Item) => {
    // 📊 Track item view
    await logItemViewed(item.id);

    // Navigate to item detail
    // router.push(`/items/${item.id}`);
    console.log('View item:', item.name);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {searchQuery.length > 0 && (
        <Text style={styles.resultsText}>
          {results.length} {results.length === 1 ? 'result' : 'results'} found
        </Text>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            onPress={() => handleItemPress(item)}
          >
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDetails}>
              {item.category} • {item.location}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            <Text style={styles.emptyText}>No items found</Text>
          ) : null
        }
      />

      <Text style={styles.note}>
        📊 Search tracking: Query and result count are logged
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resultItem: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
  note: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
});
