/**
 * Premium Features Service
 * Manages premium status, feature gating, and purchase validation using RevenueCat
 */

import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Config } from '../config';

// Constants
export const ENTITLEMENT_ID = Config.REVENUECAT_ENTITLEMENT_ID; // Must match RevenueCat Entitlement ID
const FREE_ITEM_LIMIT = 100;

export interface PremiumStatus {
  isPremium: boolean;
  active: boolean; // Alias for UI compatibility
  purchaseDate?: string;
  itemLimit: number;
  expirationDate?: string | null;
}

class PremiumService {
  private static instance: PremiumService;
  private isMockMode: boolean = false;
  private mockIsPremium: boolean = false;
  private listenerInitialized: boolean = false;
  private statusSubscribers = new Set<(status: PremiumStatus) => void>();
  
  private constructor() {}

  static getInstance(): PremiumService {
    if (!PremiumService.instance) {
      PremiumService.instance = new PremiumService();
    }
    return PremiumService.instance;
  }

  /**
   * Enable or disable mock mode for UI testing
   */
  setMockMode(enabled: boolean, isPremium: boolean = true) {
    this.isMockMode = enabled;
    this.mockIsPremium = isPremium;
    console.log(`[Premium] Mock mode ${enabled ? 'ENABLED' : 'DISABLED'}. Status: ${isPremium ? 'Premium' : 'Free'}`);
    this.notifySubscribers({
      isPremium,
      active: isPremium,
      itemLimit: isPremium ? -1 : FREE_ITEM_LIMIT,
      purchaseDate: isPremium ? new Date().toISOString() : undefined,
      expirationDate: null,
    });
  }

  private notifySubscribers(status: PremiumStatus) {
    this.statusSubscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.warn('[Premium] Failed notifying subscriber', error);
      }
    });
  }

  subscribeStatus(callback: (status: PremiumStatus) => void): () => void {
    this.statusSubscribers.add(callback);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  /**
   * Initialize premium service listeners (optional, SDK handles mostly)
   */
  async initialize(): Promise<void> {
    if (this.listenerInitialized) {
      return;
    }

    // RevenueCat is initialized in _layout.tsx
    // We can add listener here if needed
    Purchases.addCustomerInfoUpdateListener((info) => {
      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      const hasPro = !!entitlement;
      if (__DEV__) {
        console.log('[Premium] Customer info updated. Status:', hasPro ? 'Premium' : 'Free');
      }

      this.notifySubscribers({
        isPremium: hasPro,
        active: hasPro,
        purchaseDate: entitlement?.latestPurchaseDate,
        expirationDate: entitlement?.expirationDate,
        itemLimit: hasPro ? -1 : FREE_ITEM_LIMIT,
      });
    });
    this.listenerInitialized = true;
    if (__DEV__) console.log('[Premium] Listener initialized');
  }

  /**
   * Explicitly refresh customer info after purchase to ensure UI updates
   */
  async refreshCustomerInfo(): Promise<PremiumStatus> {
    try {
      // Force sync with RevenueCat backend
      await Purchases.syncPurchases();
      const status = await this.getPremiumStatus();
      this.notifySubscribers(status);
      return status;
    } catch (error) {
      console.error('[Premium] Failed to refresh customer info', error);
      const status = await this.getPremiumStatus();
      this.notifySubscribers(status);
      return status;
    }
  }

  /**
   * Check if user has premium access via RevenueCat Entitlements
   */
  async isPremium(): Promise<boolean> {
    if (this.isMockMode) {
      return this.mockIsPremium;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      // Check for 'premium' entitlement
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        return true;
      }
      return false;
    } catch (error: any) {
      // Suppress "no singleton" error which happens on app startup before init
      if (error?.message && error.message.includes('There is no singleton instance')) {
        return false;
      }
      console.warn('[Premium] Failed to check status, defaulting to false', error);
      return false;
    }
  }

  /**
   * Get formatted premium status
   */
  async getPremiumStatus(): Promise<PremiumStatus> {
    if (this.isMockMode) {
      return {
        isPremium: this.mockIsPremium,
        active: this.mockIsPremium,
        purchaseDate: this.mockIsPremium ? new Date().toISOString() : undefined,
        expirationDate: null,
        itemLimit: this.mockIsPremium ? -1 : FREE_ITEM_LIMIT,
      };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isPremium = !!entitlement;

      return {
        isPremium,
        active: isPremium,
        purchaseDate: entitlement?.latestPurchaseDate,
        expirationDate: entitlement?.expirationDate,
        itemLimit: isPremium ? -1 : FREE_ITEM_LIMIT,
      };
    } catch (error: any) {
       // Suppress "no singleton" error which happens on app startup before init
       if (error?.message && error.message.includes('There is no singleton instance')) {
         return { isPremium: false, active: false, itemLimit: FREE_ITEM_LIMIT };
       }
       console.error('[Premium] Error getting detailed status', error);
       return { isPremium: false, active: false, itemLimit: FREE_ITEM_LIMIT };
    }
  }

  /**
   * Get available packages (products) to display in Paywall
   */
  async getOfferings(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length !== 0) {
        return offerings.current.availablePackages;
      }
      return [];
    } catch (error) {
      console.error('[Premium] Error fetching offerings', error);
      return [];
    }
  }

  /**
   * Purchase a package
   */
  async purchasePackage(pack: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('[Premium] Purchase failed', error);
      }
      throw error;
    }
  }

  /**
   * Restore purchases (e.g. on new device)
   */
  async restorePurchase(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (error) {
      console.error('[Premium] Restore failed', error);
      return false;
    }
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
    if (PREMIUM_FEATURES[feature].free) {
      return true;
    }
    return this.isPremium();
  }

  // --- Debug / Mock Methods ---
  
  async activatePremium(): Promise<void> {
    // When in dev/mock mode, this can be used to toggle state
    this.setMockMode(true, true);
    console.log('[Premium] Activated Mock Premium');
  }

  async deactivatePremium(): Promise<void> {
    this.setMockMode(true, false);
    console.log('[Premium] Deactivated Mock Premium (Free Tier)');
  }
}

// Premium feature definitions
export type PremiumFeature = 
  | 'unlimited_items'
  | 'cloud_sync'
  | 'ai_assistant'
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
  ai_assistant: {
    name: 'AI Assistant',
    description: 'Unlimited AI shelf analysis (Free: 5/mo)',
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
export const restorePurchase = () => Premium.restorePurchase();
export const initializePremium = () => Premium.initialize();
export const refreshPremiumStatus = () => Premium.refreshCustomerInfo();
export const subscribePremiumStatus = (callback: (status: PremiumStatus) => void) => Premium.subscribeStatus(callback);

// Constants
export { FREE_ITEM_LIMIT };

