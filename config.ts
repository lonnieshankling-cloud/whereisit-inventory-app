// App configuration
// To use Gemini AI features, add your API key here
// Get a free API key from: https://aistudio.google.com/app/apikey

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
  // Gemini API key for shelf analysis and AI features
  // This should match the GeminiApiKey secret in your backend
  GEMINI_API_KEY: (extra as Record<string, string | undefined>).EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  
  // Backend URL (when sync is enabled)
  // Default empty so we fall back to cloud env when not provided
  BACKEND_URL: (extra as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '',

  // Clerk publishable key for authentication (set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env)
  CLERK_PUBLISHABLE_KEY: (extra as Record<string, string | undefined>).EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',

  // RevenueCat API Keys
  REVENUECAT_GOOGLE_API_KEY: (extra as Record<string, string | undefined>).EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || '',

  // RevenueCat Entitlement ID for premium features
  // Set via EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID env var, defaults to 'Pro Access'
  REVENUECAT_ENTITLEMENT_ID: (extra as Record<string, string | undefined>).EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'Pro Access',
};
