import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
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
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput 
        placeholder="Search for items..." 
        style={styles.searchBar} 
        placeholderTextColor="#999"
      />

      {/* Stats Row (like your web app) */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>39</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Expiring</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Locations</Text>

      {/* List of Locations */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {locations.map((location, index) => (
          <TouchableOpacity key={index} style={styles.card}>
            <Text style={styles.cardText}>{location}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#000' },
  addButton: { backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  searchBar: { 
    backgroundColor: '#f5f5f5', 
    padding: 15, 
    borderRadius: 12, 
    fontSize: 16,
    marginBottom: 20 
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
  },
  cardText: { fontSize: 16, fontWeight: '500' }
});