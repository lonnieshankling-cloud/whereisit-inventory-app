import { Analytics, AnalyticsStats } from '@/utils/analytics';
import { Premium } from '@/utils/premium';
import { Activity, BarChart3, Calendar } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AnalyticsDebugScreen() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [eventsByDay, setEventsByDay] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [statsData, dayData] = await Promise.all([
        Analytics.getStats(),
        Analytics.getEventsByDay(7),
      ]);
      setStats(statsData);
      setEventsByDay(dayData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const events = await Analytics.exportEvents();
    console.log('📊 Exported Analytics:', JSON.stringify(events, null, 2));
    Alert.alert('Exported', `${events.length} events logged to console`);
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Analytics',
      'Are you sure you want to clear all analytics data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await Analytics.clearAll();
            await loadAnalytics();
            Alert.alert('Cleared', 'Analytics data has been cleared');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No analytics data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <BarChart3 size={32} color="#007AFF" />
        <Text style={styles.title}>Analytics Dashboard</Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Activity size={24} color="#007AFF" />}
            label="Total Events"
            value={stats.totalEvents.toString()}
          />
          <StatCard
            icon={<Calendar size={24} color="#34C759" />}
            label="Days Active"
            value={stats.daysActive.toString()}
          />
        </View>
      </View>

      {/* Item Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Item Actions</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Items Added"
            value={stats.itemsAdded.toString()}
            color="#007AFF"
          />
          <StatCard
            label="Items Edited"
            value={stats.itemsEdited.toString()}
            color="#5856D6"
          />
          <StatCard
            label="Items Deleted"
            value={stats.itemsDeleted.toString()}
            color="#FF3B30"
          />
          <StatCard
            label="Photos Taken"
            value={stats.photosTaken.toString()}
            color="#FF9500"
          />
        </View>
      </View>

      {/* Feature Usage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Usage</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Searches"
            value={stats.searches.toString()}
            color="#007AFF"
          />
          <StatCard
            label="Barcodes Scanned"
            value={stats.barcodesScanned.toString()}
            color="#34C759"
          />
          <StatCard
            label="Shopping Items"
            value={stats.shoppingItemsAdded.toString()}
            color="#FF9500"
          />
          <StatCard
            label="Locations Created"
            value={stats.locationsCreated.toString()}
            color="#5856D6"
          />
        </View>
      </View>

      {/* Activity by Day */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartContainer}>
          {Object.entries(eventsByDay)
            .reverse()
            .map(([date, count]) => (
              <View key={date} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(20, (count / 50) * 150) },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            ))}
        </View>
      </View>

      {/* Date Range */}
      {stats.firstUsed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Period</Text>
          <View style={styles.dateCard}>
            <Text style={styles.dateLabel}>First Used</Text>
            <Text style={styles.dateValue}>
              {new Date(stats.firstUsed).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.dateCard}>
            <Text style={styles.dateLabel}>Last Used</Text>
            <Text style={styles.dateValue}>
              {stats.lastUsed
                ? new Date(stats.lastUsed).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Debug (Mock)</Text>
            <View style={{ gap: 8 }}>
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#34C759' }]} 
                onPress={() => {
                  Premium.activatePremium();
                  Alert.alert('Success', 'Mock Premium ACTIVATED');
                }}
              >
                <Text style={styles.buttonText}>Force Mock Premium (ON)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#FF9500' }]} 
                onPress={() => {
                  Premium.deactivatePremium();
                  Alert.alert('Success', 'Mock Premium DEACTIVATED');
                }}
              >
                <Text style={styles.buttonText}>Force Mock Free (OFF)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={loadAnalytics}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleExport}
        >
          <Text style={styles.buttonText}>Export to Console</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClear}
        >
          <Text style={styles.buttonText}>Clear Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}

function StatCard({ icon, label, value, color = '#007AFF' }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      {icon && <View style={styles.statIcon}>{icon}</View>}
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#FF3B30',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 30,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  barCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    padding: 16,
    gap: 12,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
