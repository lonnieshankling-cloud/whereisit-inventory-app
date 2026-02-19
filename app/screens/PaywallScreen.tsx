import { logEvent } from '@/utils/analytics';
import { ENTITLEMENT_ID, refreshPremiumStatus } from '@/utils/premium';
import { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

interface PaywallScreenProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
  reason?: 'item_limit' | 'feature_locked' | 'settings' | 'scan_limit';
}

export default function PaywallScreen({ 
  visible, 
  onClose, 
  onPurchaseComplete,
  reason = 'settings' 
}: PaywallScreenProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (visible) {
      // Track paywall view with reason
      logEvent('paywall_viewed', { reason });
      // Display paywall via RevenueCatUI
      displayPaywall();
    }
  }, [visible, reason]);

  const displayPaywall = async () => {
    try {
      setIsPurchasing(true);
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });

      // Handle paywall result
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        // Purchase was successful - refresh status and notify parent
        await refreshPremiumStatus();
        if (__DEV__) console.log('[Paywall] Purchase successful');
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
      } else if (result === PAYWALL_RESULT.CANCELLED) {
        // User cancelled - just close
        if (__DEV__) console.log('[Paywall] User cancelled');
        onClose();
      } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        // User already has entitlement
        if (__DEV__) console.log('[Paywall] Already has entitlement');
        onPurchaseComplete?.();
        onClose();
      }
    } catch (error) {
      console.error('[Paywall] Error:', error);
      Alert.alert(
        'Error',
        'Unable to display purchase options. Please try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!visible) return null;

  // Return minimal UI - RevenueCatUI handles paywall presentation
  return (
    <View style={styles.loadingContainer}>
      {isPurchasing && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading Premium Options...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
