import { logEvent } from '@/utils/analytics';
import { getPremiumProducts, initializeBilling, purchasePremium, restorePurchases } from '@/utils/billing';
import { PREMIUM_FEATURES, PremiumFeature } from '@/utils/premium';
import { Check, Crown, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface PaywallScreenProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
  reason?: 'item_limit' | 'feature_locked' | 'settings';
}

export default function PaywallScreen({ 
  visible, 
  onClose, 
  onPurchaseComplete,
  reason = 'settings' 
}: PaywallScreenProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [price, setPrice] = useState('$9.99');

  useEffect(() => {
    if (visible) {
      // Track paywall view with reason
      logEvent('paywall_viewed', { reason });
      
      // Initialize billing and load products
      loadProducts();
    }
  }, [visible, reason]);

  const loadProducts = async () => {
    try {
      await initializeBilling();
      const products = await getPremiumProducts();
      
      if (products && products.length > 0) {
        const premiumProduct = products[0];
        setProduct(premiumProduct);
        // Use price property for Android, localizedPrice for iOS
        const productPrice = (premiumProduct as any).localizedPrice || (premiumProduct as any).price || '$9.99';
        setPrice(productPrice);
        console.log('✅ Loaded product:', premiumProduct);
      }
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      // Keep default price if loading fails
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    
    try {
      // Use real Google Play Billing
      const success = await purchasePremium();
      
      if (success) {
        // Purchase initiated successfully
        // The billing service will handle the purchase callback
        // and activate premium automatically
        
        // Show success message
        Alert.alert(
          'Success!',
          'Premium features activated! 🎉\n\nThank you for upgrading!',
          [
            {
              text: 'OK',
              onPress: () => {
                onPurchaseComplete?.();
                onClose();
              },
            },
          ]
        );
      } else {
        // User cancelled
        console.log('ℹ️ Purchase cancelled by user');
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Unable to complete purchase. Please try again.';
      Alert.alert(
        'Purchase Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    
    try {
      const restored = await restorePurchases();
      
      if (restored) {
        Alert.alert(
          'Purchase Restored!',
          'Your premium features have been restored! 🎉',
          [
            {
              text: 'OK',
              onPress: () => {
                onPurchaseComplete?.();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'No Purchase Found',
          'We couldn\'t find any previous purchases to restore. If you\'ve already purchased, please try again in a moment.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchase. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  if (!visible) return null;

  const getHeaderText = () => {
    switch (reason) {
      case 'item_limit':
        return 'You\'ve reached 100 items!';
      case 'feature_locked':
        return 'Unlock Premium Features';
      default:
        return 'Upgrade to Premium';
    }
  };

  const getSubheaderText = () => {
    switch (reason) {
      case 'item_limit':
        return 'Upgrade to add unlimited items';
      case 'feature_locked':
        return 'Get access to all premium features';
      default:
        return 'Unlock the full power of WhereIsIt';
    }
  };

  // Premium features to display
  const premiumFeaturesList: PremiumFeature[] = [
    'unlimited_items',
    'cloud_sync',
    'advanced_analytics',
    'export_pdf',
    'export_csv',
    'unlimited_household',
    'barcode_lookup',
    'custom_categories',
    'priority_support',
  ];

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X color="#6B7280" size={24} />
        </TouchableOpacity>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Crown color="#F59E0B" size={48} />
              <Sparkles color="#F59E0B" size={24} style={styles.sparkle} />
            </View>
            <Text style={styles.title}>{getHeaderText()}</Text>
            <Text style={styles.subtitle}>{getSubheaderText()}</Text>
          </View>

          {/* Pricing */}
          <View style={styles.pricingCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Premium</Text>
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.priceDetail}>one-time payment</Text>
            </View>
            <Text style={styles.priceSubtext}>
              Lifetime access • No subscription
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            <Text style={styles.featuresTitle}>What's Included:</Text>
            {premiumFeaturesList.map((feature) => {
              const info = PREMIUM_FEATURES[feature];
              return (
                <View key={feature} style={styles.featureItem}>
                  <View style={styles.checkIcon}>
                    <Check color="#10B981" size={20} strokeWidth={3} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureName}>{info.name}</Text>
                    <Text style={styles.featureDescription}>{info.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            <Crown color="#FFFFFF" size={24} />
            <Text style={styles.purchaseButtonText}>
              {isPurchasing ? 'Processing...' : 'Upgrade to Premium'}
            </Text>
          </TouchableOpacity>

          {/* Restore Purchase */}
          <TouchableOpacity 
            style={styles.restoreButton} 
            onPress={handleRestore}
            disabled={isRestoring}
          >
            <Text style={styles.restoreButtonText}>
              {isRestoring ? 'Restoring...' : 'Restore Purchase'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            One-time payment • No recurring charges
          </Text>
          <Text style={styles.footerSmall}>
            Privacy-first • Your data stays local unless you enable cloud sync
          </Text>
        </ScrollView>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  pricingCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
  },
  bestValueBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: '#92400E',
  },
  priceDetail: {
    fontSize: 14,
    color: '#92400E',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    marginTop: 4,
  },
  featuresList: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  checkIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    flexWrap: 'wrap',
  },
  purchaseButton: {
    backgroundColor: '#F59E0B',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  footerSmall: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
});
