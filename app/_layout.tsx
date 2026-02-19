import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, type ColorSchemeName, Platform, Text, useColorScheme, View } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Config } from '../config';
import { clearAuthToken, setAuthToken } from '../services/api';
import { Premium } from '../utils/premium';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Ensure any route can be a deep link
  initialRouteName: 'index',
};

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('Failed to read auth token from SecureStore', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('Failed to save auth token to SecureStore', err);
    }
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  if (!Config.CLERK_PUBLISHABLE_KEY) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: 'red' }}>
          Missing Clerk Key
        </Text>
        <Text>Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env</Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={Config.CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <InitialLayout colorScheme={colorScheme} />
    </ClerkProvider>
  );
}

function InitialLayout({ colorScheme }: { colorScheme: ColorSchemeName }) {
  const { isSignedIn, getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  
  // Configure RevenueCat once at startup
  useEffect(() => {
    const initRevenueCat = async () => {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const apiKey = Config.REVENUECAT_GOOGLE_API_KEY;
        
        if (__DEV__) {
          console.log('[RevenueCat] Initializing with key:', apiKey ? apiKey.substring(0, 8) + '...' : 'undefined');
        }
        
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
        if (apiKey && apiKey !== 'goog_placeholder_key') {
          try {
            await Purchases.configure({ apiKey });
            if (__DEV__) console.log('[RevenueCat] ✅ Configured successfully');
            // Initialize premium service listeners
            await Premium.initialize();
            setRevenueCatReady(true);
          } catch (e) {
            console.warn('[RevenueCat] ❌ Failed to configure Purchases:', e);
            setRevenueCatReady(false);
          }
        } else {
          console.log('[RevenueCat] ⏭️  Skipping initialization: No valid API key provided');
          setRevenueCatReady(false);
        }
      }
    };

    initRevenueCat();
  }, []);

  // Link Clerk user to RevenueCat only after RevenueCat is configured
  useEffect(() => {
    const linkRevenueCatUser = async () => {
      if (!revenueCatReady || !isLoaded) {
        return;
      }

      if (isSignedIn && user?.id) {
        try {
          await Purchases.logIn(user.id);
          if (__DEV__) console.log('[RevenueCat] User linked:', user.id.substring(0, 8) + '...');

          // Restore purchases for linked user to sync existing entitlements
          try {
            const customerInfo = await Purchases.restorePurchases();
            const hasPro = !!customerInfo.entitlements.active[Config.REVENUECAT_ENTITLEMENT_ID];
            if (__DEV__) console.log('[RevenueCat] Restore purchases - Premium entitlement active:', hasPro, 'Entitlements:', Object.keys(customerInfo.entitlements.active));
          } catch (restoreError) {
            console.warn('[RevenueCat] Failed to restore purchases:', restoreError);
          }
        } catch (e) {
          console.warn('[RevenueCat] Failed to link user:', e);
        }
      } else if (!isSignedIn) {
        try {
          await Purchases.logOut();
          if (__DEV__) console.log('[RevenueCat] User logged out');
        } catch (e) {
          console.warn('[RevenueCat] Failed to log out:', e);
        }
      }
    };

    linkRevenueCatUser();
  }, [revenueCatReady, isLoaded, isSignedIn, user?.id]);

  // Token Sync Logic
  useEffect(() => {
    const syncToken = async () => {
      if (!isLoaded) return;

      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            console.log('[Auth] Token synced after sign-in');
            await setAuthToken(`Bearer ${token}`);
          } else {
            console.warn('[Auth] getToken() returned no token despite isSignedIn=true');
          }
        } catch (err) {
          console.error('[Auth] Failed to sync token:', err);
          await clearAuthToken();
        }
      } else {
        console.log('[Auth] User signed out, clearing token');
        await clearAuthToken();
      }
    };
    
    syncToken();
  }, [isSignedIn, getToken, isLoaded]);

  // 2. Hide Splash Screen logic
  // We delegate hiding the splash screen to the index page (Launchpad) when at root.
  // For other routes (deep links), we hide it immediately once loaded.
  useEffect(() => {
    if (isLoaded && segments.length > 0) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoaded, segments]);

  // Strict Auth Guard:
  // 1. BLOCK RENDER until Clerk is loaded
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FACC15' }}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 20, color: '#000', fontWeight: 'bold' }}>Loading Authentication...</Text>
      </View>
    );
  }

  const inSignInGroup = segments[0] === 'sign-in';

  console.log(`[Layout] isLoaded=${isLoaded}, isSignedIn=${isSignedIn}, segment=${segments[0]}`);

  // 3. Strict Redirection Logic
  if (isSignedIn && inSignInGroup) {
    // If signed in but on sign-in page, go to Launchpad first to show branding
    return <Redirect href="/" />;
  }

  // If NOT signed in, not in sign-in group, and NOT at root (Launchpad handles root)
  if (!isSignedIn && !inSignInGroup && segments.length > 0) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          animation: 'fade',
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal', 
            title: 'Modal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="screens/AddItemScreen" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="screens/SearchItemsScreen" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}
