import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { type ColorSchemeName, useColorScheme } from 'react-native';
import { Config } from '../config';
import { clearAuthToken, setAuthToken } from '../services/api';

export const unstable_settings = {
  anchor: '(tabs)',
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
    console.warn('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY for Clerk');
  }

  return (
    <ClerkProvider publishableKey={Config.CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthTokenSyncerLayout colorScheme={colorScheme} />
    </ClerkProvider>
  );
}

function AuthTokenSyncerLayout({ colorScheme }: { colorScheme: ColorSchemeName }) {
  const { isSignedIn, getToken } = useAuth();
  
  useEffect(() => {
    const syncToken = async () => {
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
  }, [isSignedIn, getToken]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          animation: 'fade',
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          name="sign-in" 
          options={{ 
            presentation: 'modal',
            title: 'Sign in',
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
