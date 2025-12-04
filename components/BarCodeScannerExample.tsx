import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BarCodeScanner from './BarCodeScanner';

export default function BarCodeScannerExample() {
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ data: string; type: string } | null>(null);

  const handleBarCodeScanned = (data: string, type: string) => {
    console.log('Scanned:', { data, type });
    setLastScanned({ data, type });
    setShowScanner(false);
    
    Alert.alert(
      'Barcode Scanned',
      `Type: ${type}\nData: ${data}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barcode Scanner</Text>
      
      {lastScanned && (
        <View style={styles.resultCard}>
          <Text style={styles.label}>Last Scanned:</Text>
          <Text style={styles.type}>{lastScanned.type}</Text>
          <Text style={styles.data}>{lastScanned.data}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setShowScanner(true)}
      >
        <Text style={styles.scanButtonText}>Scan Barcode</Text>
      </TouchableOpacity>

      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <BarCodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  data: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
