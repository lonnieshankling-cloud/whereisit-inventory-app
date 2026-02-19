import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const AFFILIATE_TAG = 'whereisit01-20';

export const openStoreSearch = async (query: string | null) => {
  if (!query) return;

  const encodedQuery = encodeURIComponent(query);
  const webUrl = `https://www.amazon.com/s?k=${encodedQuery}&tag=${AFFILIATE_TAG}`;
  const appUrl = Platform.select({
    ios: `amazon://s?k=${encodedQuery}&tag=${AFFILIATE_TAG}`,
    android: `com.amazon.mobile.shopping.web:///s?k=${encodedQuery}&tag=${AFFILIATE_TAG}`,
    default: webUrl,
  });

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      await WebBrowser.openBrowserAsync(webUrl);
    }
  } catch (error) {
    console.error('Failed to open store search:', error);
    await WebBrowser.openBrowserAsync(webUrl);
  }
};
