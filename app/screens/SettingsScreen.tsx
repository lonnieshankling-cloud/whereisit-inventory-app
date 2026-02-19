import { Analytics } from '@/utils/analytics';
import { deactivatePremium, getPremiumStatus, PremiumStatus, refreshPremiumStatus, subscribePremiumStatus } from '@/utils/premium';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { ArrowUpDown, BarChart2, ChevronRight, Download, FileText, HelpCircle, Info, LogOut, Mail, Moon, Shield, Star, Trash2, UserPlus, Users, Vibrate, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    Appearance,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { clearAuthToken, householdApi, setAuthToken } from '../../services/api';
import { databaseService } from '../../services/databaseService';
import { generateInsuranceReport } from '../../services/reportService';
import HouseholdManagementScreen from './HouseholdManagementScreen';
import PaywallScreen from './PaywallScreen';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingsState {
  darkMode: boolean;
  hapticFeedback: boolean;
  defaultCurrency: string;
  defaultCameraMode: string;
  savePhotosToGallery: boolean;
  warrantyAlerts: boolean;
}

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const router = useRouter();
  const { isSignedIn, signOut, getToken } = useAuth();
  const { user } = useUser();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showHouseholdManagement, setShowHouseholdManagement] = useState(false);
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false);
  const [showJoinHouseholdModal, setShowJoinHouseholdModal] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [household, setHousehold] = useState<any>(null);
  const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: Appearance.getColorScheme() === 'dark',
    hapticFeedback: true,
    defaultCurrency: 'USD',
    defaultCameraMode: 'Shelf',
    savePhotosToGallery: true,
    warrantyAlerts: true,
  });
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [authSyncing, setAuthSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
      // Sync switch with current system appearance
      const colorScheme = Appearance.getColorScheme();
      setSettings(prev => ({ ...prev, darkMode: colorScheme === 'dark' }));
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const unsubscribe = subscribePremiumStatus((status) => {
      setPremiumStatus(status);
    });

    // Force a fresh sync whenever settings opens
    refreshPremiumStatus()
      .then((status) => setPremiumStatus(status))
      .catch((error) => console.warn('[Settings] Failed to refresh premium status', error));

    return unsubscribe;
  }, [visible]);

  useEffect(() => {
    if (visible) {
      syncAuthToken();
    }
  }, [visible, isSignedIn]);

  const syncAuthToken = async () => {
    setAuthSyncing(true);
    setAuthError(null);
    try {
      const token = await getToken();
      if (token) {
        await setAuthToken(`Bearer ${token}`);
        setAuthTokenState(token);
      } else {
        await clearAuthToken();
        setAuthTokenState(null);
      }
    } catch (error) {
      console.error('Failed to sync auth token', error);
      setAuthError('Unable to load session');
      await clearAuthToken();
      setAuthTokenState(null);
    } finally {
      setAuthSyncing(false);
    }
  };

  const loadSettings = async () => {
    try {
      const status = await getPremiumStatus();
      setPremiumStatus(status);
      
      // Load item count
      await databaseService.initialize();
      const items = await databaseService.getAllItems();
      setItemCount(items.length);

      // Load household data
      await loadHouseholdData();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadHouseholdData = async () => {
    try {
      const householdData = await householdApi.get();
      setHousehold(householdData);
      
      if (householdData) {
        const membersData = await householdApi.getMembers();
        setHouseholdMembers(membersData.members || []);
      }
    } catch (error) {
      // No household yet, that's okay
      console.log('No household data');
      setHousehold(null);
      setHouseholdMembers([]);
    }
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Not signed in', 'Please sign in first, then try creating a household.');
      return;
    }

    // Make sure we have a fresh token in the API client
    await syncAuthToken();

    try {
      await householdApi.create(newHouseholdName);
      Alert.alert('Success', `Household "${newHouseholdName}" created!`);
      setNewHouseholdName('');
      setShowCreateHouseholdModal(false);
      await loadHouseholdData();
    } catch (error) {
      console.error('Failed to create household:', error);
      const msg = (error as any)?.message || String(error) || 'Unknown error';
      Alert.alert('Error', `Failed to create household.\n\nDetails: ${msg}`);
    }
  };

  const handleJoinHousehold = async () => {
    if (!invitationCode.trim()) {
      Alert.alert('Error', 'Please enter an invitation code');
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Not signed in', 'Please sign in first, then try joining a household.');
      return;
    }

    await syncAuthToken();

    try {
      await householdApi.acceptInvitationByCode(invitationCode.toUpperCase());
      Alert.alert('Success', 'You have joined the household!');
      setInvitationCode('');
      setShowJoinHouseholdModal(false);
      await loadHouseholdData();
    } catch (error) {
      console.error('Failed to join household:', error);
      const msg = (error as any)?.message || String(error) || 'Unknown error';
      Alert.alert('Error', `Failed to join household.\n\nDetails: ${msg}`);
    }
  };

  const handleLeaveHousehold = () => {
    const isOwner = household?.owner_id === 'current_user_id'; // TODO: Get actual user ID
    
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'You are the owner of this household. To leave, you must first delete the household or transfer ownership.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Leave Household?',
      'You will lose access to all items in this household inventory. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await householdApi.leave();
              Alert.alert('Success', 'You have left the household');
              await loadHouseholdData();
            } catch (error) {
              console.error('Failed to leave household:', error);
              Alert.alert('Error', 'Failed to leave household. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const handleSignIn = () => {
    router.push('/sign-in');
  };

  const handleSignOut = async () => {
    try {
      await signOut?.();
      await clearAuthToken();
      setAuthTokenState(null);
      setHousehold(null);
      setHouseholdMembers([]);
    } catch (error) {
      console.error('Failed to sign out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleClearCache = async () => {
    try {
      const cacheDirectory = (FileSystem as any).cacheDirectory;
      if (cacheDirectory) {
        await FileSystem.deleteAsync(cacheDirectory, { idempotent: true });
        Alert.alert('Success', 'Cache cleared successfully');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    }
  };
  
  const cycleSortOrder = () => {
    // Placeholder for future implementation
    Alert.alert('Sort Order', 'Default sort order feature coming soon!');
  };

  const updateSetting = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply dark mode immediately
    if (key === 'darkMode') {
      Appearance.setColorScheme(value ? 'dark' : 'light');
    }
  };

  const handleExportCSV = async () => {
    Alert.alert(
      'Export to CSV',
      'This will export all your inventory items to CSV format.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              const items = await databaseService.getAllItems();
              const csv = generateCSV(items);
              console.log('📊 CSV Export:\n', csv);
              Alert.alert('Success', 'CSV exported to console. You can copy it from your development console.');
            } catch (error) {
              Alert.alert('Error', 'Failed to export CSV');
            }
          },
        },
      ]
    );
  };

  const handleExportPDF = () => {
    Alert.alert(
      'Export Insurance Report PDF',
      'This will generate a PDF report of your items with photos for insurance purposes. This may take a few moments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate PDF',
          onPress: async () => {
            try {
              setIsGeneratingPDF(true);
              await generateInsuranceReport();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to generate PDF');
            } finally {
              setIsGeneratingPDF(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all items, containers, locations, and photos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Confirm Delete',
              'Are you absolutely sure? This will remove everything.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Delete all data
                      await databaseService.deleteAllItems();
                      Alert.alert('Success', 'All data has been deleted.');
                      setItemCount(0);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete data');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.profileHeader}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>
                    {user?.fullName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
                <Text style={styles.profileEmail}>{user?.primaryEmailAddress?.emailAddress || 'Not signed in'}</Text>
                <View style={[styles.badgeContainer, premiumStatus?.active ? styles.premiumBadge : styles.freeBadge]}>
                  <Text style={[styles.badgeText, premiumStatus?.active ? styles.premiumText : styles.freeText]}>
                    {premiumStatus?.active ? 'Premium' : 'Free Plan'}
                  </Text>
                </View>
              </View>
            </View>

            {authError ? (
              <Text style={[styles.versionText, { color: '#EF4444', marginTop: 4 }]}>{authError}</Text>
            ) : null}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.buttonItem}
              onPress={isSignedIn ? handleSignOut : handleSignIn}
            >
              <LogOut color={isSignedIn ? '#EF4444' : '#3B82F6'} size={20} />
              <Text style={[styles.buttonText, isSignedIn ? styles.dangerText : null]}>
                {isSignedIn ? 'Sign Out' : 'Sign In'}
              </Text>
              <ChevronRight color={isSignedIn ? '#EF4444' : '#9CA3AF'} size={18} />
            </TouchableOpacity>
          </View>

          {/* Analytics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            
            <TouchableOpacity 
              style={styles.buttonItem}
              onPress={() => router.push('/analytics')}
            >
              <BarChart2 color="#3B82F6" size={20} />
              <Text style={styles.buttonText}>View Analytics</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>
          </View>

          {/* General Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <ArrowUpDown color="#6B7280" size={20} />
                <Text style={styles.settingText}>Default Sort Order</Text>
              </View>
              <TouchableOpacity onPress={cycleSortOrder}>
                <Text style={styles.valueText}>Date Added</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Moon color="#6B7280" size={20} />
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => updateSetting('darkMode', value)}
                trackColor={{ false: '#DBEAFE', true: '#3B82F6' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Vibrate color="#6B7280" size={20} />
                <Text style={styles.settingText}>Haptic Feedback</Text>
              </View>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={(value) => updateSetting('hapticFeedback', value)}
                trackColor={{ false: '#DBEAFE', true: '#3B82F6' }}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingText}>Default Currency</Text>
              </View>
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorValue}>{settings.defaultCurrency}</Text>
                <ChevronRight color="#9CA3AF" size={18} />
              </View>
            </TouchableOpacity>
          </View>


          {/* Data Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            
            <TouchableOpacity style={styles.buttonItem} onPress={handleExportCSV}>
              <Download color="#6B7280" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={styles.buttonText}>Export Data (CSV)</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonItem} onPress={handleClearCache}>
              <Trash2 color="#6B7280" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={styles.buttonText}>Clear Image Cache</Text>
                <Text style={styles.settingDescription}>Free up space on your device</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>
          </View>

          {/* Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <TouchableOpacity style={styles.buttonItem} onPress={() => Linking.openURL('https://docs.whereisit-app.com')}>
              <HelpCircle color="#6B7280" size={20} />
              <Text style={styles.buttonText}>Help Center</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonItem} onPress={async () => {
              if (await StoreReview.hasAction()) StoreReview.requestReview();
            }}>
              <Star color="#6B7280" size={20} />
              <Text style={styles.buttonText}>Rate the App</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonItem} onPress={() => Linking.openURL('https://whereisit-app.com/privacy')}>
              <FileText color="#6B7280" size={20} />
              <Text style={styles.buttonText}>Privacy Policy</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>
          </View>

          {/* Household */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Household</Text>
            
            {!household ? (
              // No household - show create option
              <>
                <View style={styles.householdCard}>
                  <Users color="#3B82F6" size={24} />
                  <View style={styles.householdCardContent}>
                    <Text style={styles.householdCardTitle}>Cloud Sync with Family</Text>
                    <Text style={styles.householdCardDescription}>
                      Create a household to share your inventory with family members and sync across devices.
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.householdButton}
                  onPress={() => setShowCreateHouseholdModal(true)}
                >
                  <UserPlus color="#FFFFFF" size={20} />
                  <Text style={styles.householdButtonText}>Create Household</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.householdButton, { backgroundColor: '#10B981', marginTop: 12 }]}
                  onPress={() => setShowJoinHouseholdModal(true)}
                >
                  <Mail color="#FFFFFF" size={20} />
                  <Text style={styles.householdButtonText}>Join with Code</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Has household - show management options
              <>
                <View style={styles.householdCard}>
                  <Users color="#10B981" size={24} />
                  <View style={styles.householdCardContent}>
                    <Text style={styles.householdCardTitle}>{household.name}</Text>
                    <Text style={styles.householdCardDescription}>
                      {householdMembers.length} {householdMembers.length === 1 ? 'member' : 'members'} • Cloud sync active
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.buttonItem}
                  onPress={() => setShowHouseholdManagement(true)}
                >
                  <Users color="#3B82F6" size={20} />
                  <Text style={styles.buttonText}>Manage Members</Text>
                  <ChevronRight color="#9CA3AF" size={18} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.buttonItem}
                  onPress={handleLeaveHousehold}
                >
                  <LogOut color="#EF4444" size={20} />
                  <Text style={[styles.buttonText, styles.dangerText]}>Leave Household</Text>
                  <ChevronRight color="#EF4444" size={18} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* AI & Scanning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI & Scanning</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingText}>Default Camera Mode</Text>
              </View>
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorValue}>{settings.defaultCameraMode}</Text>
                <ChevronRight color="#9CA3AF" size={18} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Download color="#6B7280" size={20} />
                <Text style={styles.settingText}>Save Photos to Gallery</Text>
              </View>
              <Switch
                value={settings.savePhotosToGallery}
                onValueChange={(value) => updateSetting('savePhotosToGallery', value)}
                trackColor={{ false: '#DBEAFE', true: '#3B82F6' }}
              />
            </View>
          </View>

          {/* Data Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            
            <TouchableOpacity 
              style={styles.buttonItem}
              onPress={handleExportCSV}
            >
              <FileText color="#3B82F6" size={20} />
              <Text style={styles.buttonText}>Export to CSV</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.buttonItem}
              onPress={handleExportPDF}
            >
              <FileText color="#10B981" size={20} />
              <Text style={styles.buttonText}>Export Insurance Report PDF</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.buttonItem}
              onPress={handleDeleteAllData}
            >
              <Trash2 color="#EF4444" size={20} />
              <Text style={[styles.buttonText, styles.dangerText]}>Delete All Data</Text>
              <ChevronRight color="#EF4444" size={18} />
            </TouchableOpacity>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingText}>Warranty Expiry Alerts</Text>
              </View>
              <Switch
                value={settings.warrantyAlerts}
                onValueChange={(value) => updateSetting('warrantyAlerts', value)}
                trackColor={{ false: '#DBEAFE', true: '#3B82F6' }}
              />
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Info color="#6B7280" size={20} />
                <Text style={styles.settingText}>Version</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => Alert.alert('About', 'WhereIsIt Inventory - Home inventory management app built with React Native.')}
            >
              <View style={styles.settingLabel}>
                <FileText color="#6B7280" size={20} />
                <Text style={styles.settingText}>About App</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => Alert.alert('Privacy', 'Your data is stored locally on your device. We do not collect or transmit any data.')}
            >
              <View style={styles.settingLabel}>
                <Shield color="#6B7280" size={20} />
                <Text style={styles.settingText}>Privacy Policy</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => Alert.alert('Terms of Service', 'By using WhereIsIt Inventory, you agree to our Terms of Service.\n\nKey points:\n• Use the app for personal inventory management\n• Keep your account secure\n• Do not upload illegal content\n• We provide the app "as is"\n• Premium features via in-app purchase\n\nFull terms available in the app repository.')}
            >
              <View style={styles.settingLabel}>
                <FileText color="#6B7280" size={20} />
                <Text style={styles.settingText}>Terms of Service</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => Alert.alert('Contact Support', 'support@whereisit-inventory.com\n\nFor issues or suggestions, please email us.')}
            >
              <View style={styles.settingLabel}>
                <Mail color="#6B7280" size={20} />
                <Text style={styles.settingText}>Contact Support</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />
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

      {/* Household Management Modal */}
      <HouseholdManagementScreen
        visible={showHouseholdManagement}
        onClose={() => {
          setShowHouseholdManagement(false);
          loadHouseholdData();
        }}
      />

      {/* Create Household Modal */}
      {showCreateHouseholdModal && (
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Household</Text>
              <TouchableOpacity onPress={() => setShowCreateHouseholdModal(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Household Name</Text>
              <TextInput
                style={styles.input}
                value={newHouseholdName}
                onChangeText={setNewHouseholdName}
                placeholder="e.g., Smith Family"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <Text style={styles.inputHint}>
                This name will be visible to all household members.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowCreateHouseholdModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleCreateHousehold}
                >
                  <Text style={styles.modalConfirmText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Join Household Modal */}
      {showJoinHouseholdModal && (
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Household</Text>
              <TouchableOpacity onPress={() => setShowJoinHouseholdModal(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Invitation Code</Text>
              <TextInput
                style={[styles.input, { textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' }]}
                value={invitationCode}
                onChangeText={(text) => setInvitationCode(text.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />
              <Text style={styles.inputHint}>
                Enter the 6-character code shared by the household owner.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowJoinHouseholdModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleJoinHousehold}
                >
                  <Text style={styles.modalConfirmText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Helper function to generate CSV
function generateCSV(items: any[]): string {
  const headers = ['ID', 'Name', 'Brand', 'Category', 'Quantity', 'Container', 'Location', 'Description', 'Created Date'];
  const rows = items.map(item => [
    item.id,
    item.name,
    item.brand || '',
    item.category || '',
    item.quantity || 1,
    item.container_id || '',
    item.location_id || '',
    item.description || '',
    item.created_at || new Date().toISOString(),
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => JSON.stringify(cell)).join(',')),
  ].join('\n');
  
  return csvContent;
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
    height: '95%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontSize: 28,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 0,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  buttonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  dangerText: {
    color: '#EF4444',
  },
  versionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  spacer: {
    height: 20,
  },
  householdCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  householdCardContent: {
    flex: 1,
  },
  householdCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  householdCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  householdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
  },
  householdButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Profile & New Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  badgeContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  premiumBadge: {
    backgroundColor: '#DBEAFE',
  },
  freeBadge: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  premiumText: {
    color: '#2563EB',
  },
  freeText: {
    color: '#4B5563',
  },
  valueText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#D1D5DB',
  },
});
