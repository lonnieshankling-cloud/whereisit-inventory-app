import BarCodeScannerExample from '@/components/BarCodeScannerExample';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function BarcodeScannerTestScreen() {
  return (
    <View style={styles.container}>
      <BarCodeScannerExample />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
