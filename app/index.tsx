import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

export default function LaunchScreen() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Start animation
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withSpring(1);

    if (!isLoaded) return;

    // Minimum display time for the splash logic to run and router to be ready
    const timer = setTimeout(() => {
        // Hide native splash screen if it's still visible
        SplashScreen.hideAsync().catch(() => {});

        if (isSignedIn) {
          router.replace('/(tabs)');
        } else {
          router.replace('/sign-in');
        }
    }, 3000); // 3 seconds to show branding

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>WhereIsIt?</Text>
        <Text style={styles.tagline}>Track everything, find anything.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 24,
    borderRadius: 28,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 80,
  },
});
