import AnalyticsDebugScreen from '@/components/AnalyticsDebugScreen';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <AnalyticsDebugScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
