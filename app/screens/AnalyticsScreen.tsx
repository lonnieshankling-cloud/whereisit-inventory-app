import { BarChart, PieChart } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { databaseService, LocalItem } from '../services/databaseService';

interface CategoryStats {
  category: string;
  count: number;
  value: number;
  percentage: number;
}

interface LocationStats {
  location: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  totalQuantity: number;
  categoriesCount: number;
  locationsCount: number;
  categoryStats: CategoryStats[];
  locationStats: LocationStats[];
  topValueItems: LocalItem[];
  recentItems: LocalItem[];
  lowStockItems: LocalItem[];
}

const LOCATION_NAMES: Record<string, string> = {
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

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      await databaseService.initialize();
      const items = await databaseService.getAllItems();

      // Calculate total value and quantity
      const totalValue = items.reduce((sum, item) => {
        const price = item.purchase_price || 0;
        const qty = item.quantity || 1;
        return sum + (price * qty);
      }, 0);

      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

      // Category statistics
      const categoryMap = new Map<string, { count: number; value: number }>();
      items.forEach(item => {
        const category = item.category || 'Uncategorized';
        const existing = categoryMap.get(category) || { count: 0, value: 0 };
        const itemValue = (item.purchase_price || 0) * (item.quantity || 1);
        categoryMap.set(category, {
          count: existing.count + 1,
          value: existing.value + itemValue,
        });
      });

      const categoryStats: CategoryStats[] = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          count: stats.count,
          value: stats.value,
          percentage: (stats.count / items.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Location statistics
      const locationMap = new Map<string, number>();
      items.forEach(item => {
        if (item.location_id) {
          const location = LOCATION_NAMES[item.location_id] || item.location_id;
          locationMap.set(location, (locationMap.get(location) || 0) + 1);
        }
      });

      const locationStats: LocationStats[] = Array.from(locationMap.entries())
        .map(([location, count]) => ({
          location,
          count,
          percentage: (count / items.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top value items
      const topValueItems = [...items]
        .filter(item => item.purchase_price && item.purchase_price > 0)
        .sort((a, b) => {
          const aValue = (a.purchase_price || 0) * (a.quantity || 1);
          const bValue = (b.purchase_price || 0) * (b.quantity || 1);
          return bValue - aValue;
        })
        .slice(0, 5);

      // Recent items
      const recentItems = [...items]
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, 5);

      // Low stock items (items with min_quantity set and below threshold)
      const lowStockItems = items
        .filter(item => {
          if (!item.min_quantity) return false;
          const quantity = item.quantity || 0;
          return quantity <= item.min_quantity;
        })
        .sort((a, b) => {
          const aPercentage = ((a.quantity || 0) / (a.min_quantity || 1)) * 100;
          const bPercentage = ((b.quantity || 0) / (b.min_quantity || 1)) * 100;
          return aPercentage - bPercentage;
        })
        .slice(0, 10);

      setData({
        totalItems: items.length,
        totalValue,
        averageValue: items.length > 0 ? totalValue / items.length : 0,
        totalQuantity,
        categoriesCount: categoryMap.size,
        locationsCount: locationMap.size,
        categoryStats,
        locationStats,
        topValueItems,
        recentItems,
        lowStockItems,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Inventory insights and trends</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
          <Text style={styles.summaryValue}>{data.totalItems}</Text>
          <Text style={styles.summaryLabel}>Total Items</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
          <Text style={styles.summaryValue}>${data.totalValue.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardWarning]}>
          <Text style={styles.summaryValue}>{data.totalQuantity}</Text>
          <Text style={styles.summaryLabel}>Total Quantity</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardInfo]}>
          <Text style={styles.summaryValue}>${data.averageValue.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Avg Value</Text>
        </View>
      </View>

      {/* Category Distribution */}
      {data.categoryStats.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart color="#3B82F6" size={24} />
            <Text style={styles.sectionTitle}>Category Distribution</Text>
          </View>
          <View style={styles.statsContainer}>
            {data.categoryStats.map((stat, index) => (
              <View key={stat.category} style={styles.statRow}>
                <View style={styles.statInfo}>
                  <View style={[styles.statDot, { backgroundColor: getCategoryColor(index) }]} />
                  <Text style={styles.statCategory}>{stat.category}</Text>
                </View>
                <View style={styles.statValues}>
                  <Text style={styles.statCount}>{stat.count} items</Text>
                  <Text style={styles.statPercentage}>{stat.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.chartContainer}>
            {data.categoryStats.map((stat, index) => (
              <View
                key={stat.category}
                style={[
                  styles.barSegment,
                  {
                    width: `${stat.percentage}%`,
                    backgroundColor: getCategoryColor(index),
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Location Distribution */}
      {data.locationStats.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart color="#10B981" size={24} />
            <Text style={styles.sectionTitle}>Location Distribution</Text>
          </View>
          <View style={styles.statsContainer}>
            {data.locationStats.map((stat, index) => (
              <View key={stat.location} style={styles.statRow}>
                <View style={styles.statInfo}>
                  <View style={[styles.statDot, { backgroundColor: getLocationColor(index) }]} />
                  <Text style={styles.statCategory}>{stat.location}</Text>
                </View>
                <View style={styles.statValues}>
                  <Text style={styles.statCount}>{stat.count} items</Text>
                  <Text style={styles.statPercentage}>{stat.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top Value Items */}
      {data.topValueItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Valuable Items</Text>
          {data.topValueItems.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemRank}>
                <Text style={styles.itemRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.category && (
                  <Text style={styles.itemCategory}>{item.category}</Text>
                )}
              </View>
              <View style={styles.itemValue}>
                <Text style={styles.itemPrice}>
                  ${((item.purchase_price || 0) * (item.quantity || 1)).toFixed(2)}
                </Text>
                {item.quantity && item.quantity > 1 && (
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Low Stock Items */}
      {data.lowStockItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Low Stock Alerts</Text>
          <Text style={styles.sectionSubtitle}>Items below minimum quantity threshold</Text>
          {data.lowStockItems.map((item) => {
            const percentage = item.min_quantity 
              ? Math.round(((item.quantity || 0) / item.min_quantity) * 100)
              : 0;
            const isOutOfStock = (item.quantity || 0) === 0;
            
            return (
              <View key={item.id} style={styles.lowStockItem}>
                <View style={styles.lowStockInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.lowStockDetails}>
                    {item.location_id && (
                      <Text style={styles.itemLocation}>
                        📍 {LOCATION_NAMES[item.location_id] || item.location_id}
                      </Text>
                    )}
                    <Text style={styles.lowStockThreshold}>
                      Min: {item.min_quantity}
                    </Text>
                  </View>
                </View>
                <View style={styles.lowStockRight}>
                  <View style={[
                    styles.lowStockBadge,
                    isOutOfStock && styles.outOfStockBadge
                  ]}>
                    <Text style={[
                      styles.lowStockQuantity,
                      isOutOfStock && styles.outOfStockText
                    ]}>
                      {item.quantity || 0} / {item.min_quantity}
                    </Text>
                  </View>
                  <Text style={[
                    styles.percentageText,
                    isOutOfStock && styles.percentageTextDanger
                  ]}>
                    {percentage}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Recent Activity */}
      {data.recentItems.length > 0 && (
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionSubtitle}>Recently added items</Text>
          {data.recentItems.map((item) => {
            const date = new Date(item.created_at);
            const timeAgo = getTimeAgo(date);
            return (
              <View key={item.id} style={styles.recentItem}>
                <View style={styles.recentInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.recentTime}>{timeAgo}</Text>
                </View>
                {item.purchase_price && (
                  <Text style={styles.recentPrice}>${item.purchase_price.toFixed(2)}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function getCategoryColor(index: number): string {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return colors[index % colors.length];
}

function getLocationColor(index: number): string {
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1'];
  return colors[index % colors.length];
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryCardPrimary: {
    backgroundColor: '#3B82F6',
  },
  summaryCardSuccess: {
    backgroundColor: '#10B981',
  },
  summaryCardWarning: {
    backgroundColor: '#F59E0B',
  },
  summaryCardInfo: {
    backgroundColor: '#8B5CF6',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
    opacity: 0.9,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  lastSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  statsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statCategory: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  statValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  statPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    minWidth: 50,
    textAlign: 'right',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barSegment: {
    height: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  itemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemValue: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  lowStockThreshold: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  itemLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  lowStockRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  lowStockBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  outOfStockBadge: {
    backgroundColor: '#7F1D1D',
    borderColor: '#7F1D1D',
  },
  lowStockQuantity: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  outOfStockText: {
    color: '#FFFFFF',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  percentageTextDanger: {
    color: '#7F1D1D',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentInfo: {
    flex: 1,
  },
  recentTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  recentPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
