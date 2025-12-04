import { Analytics } from '@/utils/analytics';
import { deactivatePremium, FREE_ITEM_LIMIT, getPremiumStatus, PremiumStatus } from '@/utils/premium';
import { Crown, FileText, Info, Mail, Shield, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { databaseService } from '../services/databaseService';
import PaywallScreen from './PaywallScreen';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const status = await getPremiumStatus();
      setPremiumStatus(status);
      
      // Load item count
      await databaseService.initialize();
      const items = await databaseService.getAllItems();
      setItemCount(items.length);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const handleClearAnalytics = () => {
    Alert.alert(
      'Clear Analytics',
      'Are you sure you want to clear all analytics data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await Analytics.clearAll();
              Alert.alert('Success', 'Analytics data cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear analytics');
            }
          },
        },
      ]
    );
  };

  const handleDeactivatePremium = () => {
    if (__DEV__) {
      Alert.alert(
        'Deactivate Premium (Test)',
        'This will deactivate premium for testing. Only available in dev mode.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await deactivatePremium();
                await loadSettings();
                Alert.alert('Success', 'Premium deactivated');
              } catch (error) {
                Alert.alert('Error', 'Failed to deactivate premium');
              }
            },
          },
        ]
      );
    }
  };

  const handleExportAnalytics = async () => {
    try {
      const events = await Analytics.exportEvents();
      console.log('📊 Analytics Export:', JSON.stringify(events, null, 2));
      Alert.alert(
        'Analytics Exported',
        `${events.length} events logged to console. Check your development console.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export analytics');
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#6B7280" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Premium Status Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Status</Text>
            
            {premiumStatus?.isPremium ? (
              <View style={[styles.card, styles.premiumCard]}>
                <Crown color="#F59E0B" size={32} />
                <Text style={styles.premiumTitle}>Premium Active 🎉</Text>
                <Text style={styles.premiumSubtitle}>
                  Unlimited items • All features unlocked
                </Text>
                {premiumStatus.purchaseDate && (
                  <Text style={styles.premiumDate}>
                    Activated: {new Date(premiumStatus.purchaseDate).toLocaleDateString()}
                  </Text>
                )}
                
                {__DEV__ && (
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={handleDeactivatePremium}
                  >
                    <Text style={styles.testButtonText}>Deactivate (Test)</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.freeTitle}>Free Plan</Text>
                <Text style={styles.freeSubtitle}>
                  {itemCount} / {FREE_ITEM_LIMIT} items used
                </Text>
                {itemCount >= FREE_ITEM_LIMIT * 0.8 && (
                  <Text style={styles.warningText}>
                    ⚠️ Approaching item limit
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                >
                  <Crown color="#FFFFFF" size={20} />
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Information</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Info color="#6B7280" size={20} />
              <Text style={styles.menuItemText}>Version 1.0.0</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('About', 'WhereIsIt Inventory\n\nOpen source home inventory management app.')}
            >
              <FileText color="#6B7280" size={20} />
              <Text style={styles.menuItemText}>About</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Privacy', 'Your data is stored locally on your device. We respect your privacy.')}
            >
              <Shield color="#6B7280" size={20} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('Support', 'support@whereisit-inventory.com')}
            >
              <Mail color="#6B7280" size={20} />
              <Text style={styles.menuItemText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* Data & Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Privacy</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleExportAnalytics}
            >
              <FileText color="#6B7280" size={20} />
              <Text style={styles.menuItemText}>Export Analytics Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleClearAnalytics}
            >
              <Trash2 color="#EF4444" size={20} />
              <Text style={[styles.menuItemText, styles.dangerText]}>
                Clear Analytics Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dev Info */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Developer Options</Text>
              <View style={styles.devBadge}>
                <Text style={styles.devText}>🚧 Development Mode Active</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Paywall Modal */}
      <PaywallScreen
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          setShowPaywall(false);
          loadSettings();
        }}
        reason="settings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  container: {
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  premiumCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 12,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#92400E',
    marginTop: 4,
  },
  premiumDate: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
  },
  freeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  freeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
  },
  dangerText: {
    color: '#EF4444',
  },
  devBadge: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  devText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
});
