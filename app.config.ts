import type { ConfigContext, ExpoConfig } from '@expo/config';
import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseExpoConfig = (appJson.expo ?? {}) as ExpoConfig;
  const extra = {
    ...(baseExpoConfig.extra ?? {}),
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
    EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  return {
    ...baseExpoConfig,
    ...config,
    extra,
  };
};
