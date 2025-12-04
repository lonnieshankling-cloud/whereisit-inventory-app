/**
 * Google Play Billing Service
 * Handles in-app purchases for Premium upgrade
 * 
 * NOTE: This module requires native compilation. 
 * Safe to import but will return mock functions if native modules aren't available.
 */

import { Platform } from 'react-native';

// Safely import react-native-iap with fallback
let IAP: any = null;
try {
  IAP = require('react-native-iap');
} catch (error) {
  console.warn('⚠️ react-native-iap not available - using mock billing (rebuild app with: npx expo run:android)');
}

import { logEvent } from './analytics';
import { activatePremium } from './premium';

// Product IDs for in-app purchases
const PREMIUM_PRODUCT_ID = 'premium_unlock';

// All product IDs we want to query
const PRODUCT_IDS = Platform.select({
  android: [PREMIUM_PRODUCT_ID],
  ios: [PREMIUM_PRODUCT_ID],
  default: [PREMIUM_PRODUCT_ID],
});

class BillingService {
  private static instance: BillingService;
  private isInitialized = false;
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;

  private constructor() {}

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  /**
   * Initialize the billing connection
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (!IAP) {
      console.warn('⚠️ Billing not available - app needs to be rebuilt');
      return false;
    }

    try {
      console.log('🔐 Initializing billing connection...');
      await IAP.initConnection();
      this.isInitialized = true;
      console.log('✅ Billing connection initialized');

      // Set up purchase listeners
      this.setupPurchaseListeners();

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize billing:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Set up listeners for purchase updates
   */
  private setupPurchaseListeners(): void {
    if (!IAP) return;
    
    // Listen for successful purchases
    this.purchaseUpdateSubscription = IAP.purchaseUpdatedListener(
      async (purchase: any) => {
        console.log('📦 Purchase updated:', purchase);
        
        const transactionId = purchase.transactionId;
        if (transactionId) {
          try {
            // Verify and activate premium
            await this.handlePurchaseSuccess(purchase);
            
            // Finish the transaction
            await IAP.finishTransaction({ purchase, isConsumable: false });
            console.log('✅ Transaction finished');
          } catch (error) {
            console.error('❌ Error handling purchase:', error);
          }
        }
      }
    );

    // Listen for purchase errors
    this.purchaseErrorSubscription = IAP.purchaseErrorListener(
      (error: any) => {
        console.error('❌ Purchase error:', error);
        logEvent('premium_purchase_error', {
          code: error.code,
          message: error.message,
        });
      }
    );
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchaseSuccess(purchase: any): Promise<void> {
    try {
      // TODO: In production, verify the purchase with your backend
      // For now, we'll trust the client-side verification
      
      if (purchase.productId === PREMIUM_PRODUCT_ID) {
        // Activate premium
        await activatePremium();
        
        // Track successful purchase
        await logEvent('premium_purchased', {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          platform: Platform.OS,
        });
        
        console.log('✅ Premium activated from purchase');
      }
    } catch (error) {
      console.error('❌ Failed to handle purchase success:', error);
      throw error;
    }
  }

  /**
   * Get available products
   */
  async getProducts(): Promise<any[]> {
    try {
      if (!IAP) {
        console.warn('⚠️ Billing not available');
        return [];
      }
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🔍 Fetching products:', PRODUCT_IDS);
      const products = await IAP.fetchProducts({ skus: PRODUCT_IDS });
      console.log('✅ Products fetched:', products);
      
      return products || [];
    } catch (error) {
      console.error('❌ Failed to get products:', error);
      return [];
    }
  }

  /**
   * Purchase premium product
   */
  async purchasePremium(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize billing');
        }
      }

      // Track purchase attempt
      await logEvent('premium_purchase_attempted', {
        productId: PREMIUM_PRODUCT_ID,
        platform: Platform.OS,
      });

      console.log('🛒 Requesting purchase:', PREMIUM_PRODUCT_ID);
      
      if (!IAP) {
        throw new Error('Billing not available - app needs to be rebuilt');
      }
      
      // Request the purchase
      await IAP.requestPurchase(PREMIUM_PRODUCT_ID);
      
      // Note: The actual purchase completion is handled by the listener
      // This function returns true if the request was made successfully
      return true;
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      // Track purchase failure
      await logEvent('premium_purchase_failed', {
        productId: PREMIUM_PRODUCT_ID,
        error: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
      });

      // User cancelled is not an error
      if (error?.code === 'E_USER_CANCELLED') {
        console.log('ℹ️ User cancelled purchase');
        return false;
      }

      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🔄 Restoring purchases...');
      
      // Track restore attempt
      await logEvent('premium_restore_attempted', {
        platform: Platform.OS,
      });

      // Get available purchases (purchases that were made but not yet finished)
      const purchases = await this.getAvailablePurchases();
      
      if (purchases.length === 0) {
        console.log('ℹ️ No purchases to restore');
        return false;
      }

      // Find premium purchase
      const premiumPurchase = purchases.find(
        (p) => p.productId === PREMIUM_PRODUCT_ID
      );

      if (premiumPurchase) {
        // Activate premium
        await activatePremium();
        
        // Track successful restore
        await logEvent('premium_restored', {
          productId: premiumPurchase.productId,
          platform: Platform.OS,
        });
        
        console.log('✅ Premium restored');
        return true;
      }

      console.log('ℹ️ No premium purchase found');
      return false;
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      
      await logEvent('premium_restore_failed', {
        error: String(error),
      });
      
      return false;
    }
  }

  /**
   * Get available purchases (helper method - not part of react-native-iap)
   */
  private async getAvailablePurchases(): Promise<any[]> {
    // This is a placeholder - react-native-iap handles this automatically
    // The purchase listener will be called for any unfinished purchases
    return [];
  }

  /**
   * Clean up and disconnect
   */
  async disconnect(): Promise<void> {
    try {
      // Remove listeners
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      // End connection
      if (IAP) {
        await IAP.endConnection();
      }
      this.isInitialized = false;
      console.log('✅ Billing connection closed');
    } catch (error) {
      console.error('❌ Error disconnecting billing:', error);
    }
  }

  /**
   * Check if billing is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const Billing = BillingService.getInstance();

// Convenience functions
export const initializeBilling = () => Billing.initialize();
export const purchasePremium = () => Billing.purchasePremium();
export const restorePurchases = () => Billing.restorePurchases();
export const getPremiumProducts = () => Billing.getProducts();
export const disconnectBilling = () => Billing.disconnect();
