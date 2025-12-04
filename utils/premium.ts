/**
 * Premium Features Service
 * Manages premium status, feature gating, and purchase validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@whereisit_premium_status';
const PREMIUM_PURCHASE_DATE_KEY = '@whereisit_premium_purchase_date';
const FREE_ITEM_LIMIT = 100;

export interface PremiumStatus {
  isPremium: boolean;
  purchaseDate?: string;
  itemLimit: number;
}

class PremiumService {
  private static instance: PremiumService;
  private premiumStatus: boolean = false;

  private constructor() {}

  static getInstance(): PremiumService {
    if (!PremiumService.instance) {
      PremiumService.instance = new PremiumService();
    }
    return PremiumService.instance;
  }

  /**
   * Initialize premium service and load status from storage
   */
  async initialize(): Promise<void> {
    try {
      const status = await AsyncStorage.getItem(PREMIUM_KEY);
      this.premiumStatus = status === 'true';
    } catch (error) {
      console.error('Failed to load premium status:', error);
      this.premiumStatus = false;
    }
  }

  /**
   * Check if user has premium access
   */
  async isPremium(): Promise<boolean> {
    try {
      const status = await AsyncStorage.getItem(PREMIUM_KEY);
      this.premiumStatus = status === 'true';
      return this.premiumStatus;
    } catch (error) {
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  /**
   * Get premium status with details
   */
  async getPremiumStatus(): Promise<PremiumStatus> {
    const isPremium = await this.isPremium();
    let purchaseDate: string | undefined;

    if (isPremium) {
      try {
        const date = await AsyncStorage.getItem(PREMIUM_PURCHASE_DATE_KEY);
        purchaseDate = date || undefined;
      } catch (error) {
        console.error('Failed to get purchase date:', error);
      }
    }

    return {
      isPremium,
      purchaseDate,
      itemLimit: isPremium ? -1 : FREE_ITEM_LIMIT, // -1 means unlimited
    };
  }

  /**
   * Check if user can add more items based on current count
   */
  async canAddItem(currentItemCount: number): Promise<boolean> {
    const isPremium = await this.isPremium();
    if (isPremium) {
      return true;
    }
    return currentItemCount < FREE_ITEM_LIMIT;
  }

  /**
   * Get remaining items for free tier
   */
  async getRemainingItems(currentItemCount: number): Promise<number> {
    const isPremium = await this.isPremium();
    if (isPremium) {
      return -1; // Unlimited
    }
    return Math.max(0, FREE_ITEM_LIMIT - currentItemCount);
  }

  /**
   * Check if user can access a premium feature
   */
  async canAccessFeature(feature: PremiumFeature): Promise<boolean> {
    const isPremium = await this.isPremium();
    
    // Free features available to everyone
    if (PREMIUM_FEATURES[feature].free) {
      return true;
    }
    
    return isPremium;
  }

  /**
   * Activate premium (for testing or after successful purchase)
   */
  async activatePremium(): Promise<void> {
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      await AsyncStorage.setItem(PREMIUM_PURCHASE_DATE_KEY, new Date().toISOString());
      this.premiumStatus = true;
      
      if (__DEV__) {
        console.log('💎 Premium activated');
      }
    } catch (error) {
      console.error('Failed to activate premium:', error);
      throw error;
    }
  }

  /**
   * Deactivate premium (for testing only)
   */
  async deactivatePremium(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREMIUM_KEY);
      await AsyncStorage.removeItem(PREMIUM_PURCHASE_DATE_KEY);
      this.premiumStatus = false;
      
      if (__DEV__) {
        console.log('💎 Premium deactivated');
      }
    } catch (error) {
      console.error('Failed to deactivate premium:', error);
      throw error;
    }
  }

  /**
   * Restore premium purchase (from Play Store)
   */
  async restorePurchase(): Promise<boolean> {
    // TODO: Implement Play Store purchase restoration
    // For now, just check local storage
    return this.isPremium();
  }
}

// Premium feature definitions
export type PremiumFeature = 
  | 'unlimited_items'
  | 'cloud_sync'
  | 'advanced_analytics'
  | 'export_pdf'
  | 'export_csv'
  | 'unlimited_household'
  | 'priority_support'
  | 'barcode_lookup'
  | 'custom_categories'
  | 'bulk_operations';

interface FeatureInfo {
  name: string;
  description: string;
  free: boolean;
}

export const PREMIUM_FEATURES: Record<PremiumFeature, FeatureInfo> = {
  unlimited_items: {
    name: 'Unlimited Items',
    description: 'Add unlimited items to your inventory',
    free: false,
  },
  cloud_sync: {
    name: 'Cloud Backup & Sync',
    description: 'Sync your data across devices',
    free: false,
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Detailed insights and statistics',
    free: false,
  },
  export_pdf: {
    name: 'Export to PDF',
    description: 'Generate PDF reports',
    free: false,
  },
  export_csv: {
    name: 'Export to CSV',
    description: 'Export data to spreadsheets',
    free: false,
  },
  unlimited_household: {
    name: 'Unlimited Household Members',
    description: 'Share with unlimited family members',
    free: false,
  },
  priority_support: {
    name: 'Priority Support',
    description: 'Get help faster',
    free: false,
  },
  barcode_lookup: {
    name: 'Barcode Product Lookup',
    description: 'Auto-fill product details from barcodes',
    free: false,
  },
  custom_categories: {
    name: 'Custom Categories',
    description: 'Create unlimited custom categories',
    free: false,
  },
  bulk_operations: {
    name: 'Bulk Operations',
    description: 'Edit multiple items at once',
    free: true, // Currently available to all users
  },
};

// Export singleton instance
export const Premium = PremiumService.getInstance();

// Convenience functions
export const isPremiumUser = () => Premium.isPremium();
export const canAddItem = (count: number) => Premium.canAddItem(count);
export const getRemainingItems = (count: number) => Premium.getRemainingItems(count);
export const canAccessFeature = (feature: PremiumFeature) => Premium.canAccessFeature(feature);
export const activatePremium = () => Premium.activatePremium();
export const deactivatePremium = () => Premium.deactivatePremium();
export const getPremiumStatus = () => Premium.getPremiumStatus();

// Constants
export { FREE_ITEM_LIMIT };
