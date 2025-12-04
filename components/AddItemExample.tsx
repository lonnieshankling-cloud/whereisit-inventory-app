/**
 * Example Integration: Add Item Screen
 * 
 * This shows how to integrate analytics into your existing screens
 * Copy and adapt these patterns to your actual screens
 */

import {
    logBarcodeScanned,
    logItemAdded,
    logPhotoTaken
} from '@/utils/analytics';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AddItemExample() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [barcode, setBarcode] = useState('');

  // Example: Track when item is added
  const handleAddItem = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    try {
      // Your existing database code here
      // await database.addItem({ name, category, photoUri, barcode });

      // 📊 Track analytics event
      await logItemAdded(category || undefined, !!photoUri);

      Alert.alert('Success', 'Item added!');
      
      // Reset form
      setName('');
      setCategory('');
      setPhotoUri('');
      setBarcode('');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  // Example: Track when photo is taken
  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        
        // 📊 Track analytics event
        await logPhotoTaken('camera');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  // Example: Track when photo is selected from gallery
  const handleSelectPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        
        // 📊 Track analytics event
        await logPhotoTaken('gallery');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
    }
  };

  // Example: Track barcode scan
  const handleBarcodeScan = async (data: string, type: string) => {
    setBarcode(data);
    
    // 📊 Track analytics event
    await logBarcodeScanned(type, true);
    
    // Optional: Look up product info
    // const productInfo = await lookupBarcode(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Item (Example)</Text>

      <TextInput
        style={styles.input}
        placeholder="Item Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Category (optional)"
        value={category}
        onChangeText={setCategory}
      />

      <TextInput
        style={styles.input}
        placeholder="Barcode (optional)"
        value={barcode}
        onChangeText={setBarcode}
      />

      <View style={styles.photoButtons}>
        <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
          <Text style={styles.buttonText}>📷 Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSelectPhoto}>
          <Text style={styles.buttonText}>🖼️ Choose Photo</Text>
        </TouchableOpacity>
      </View>

      {photoUri ? (
        <Text style={styles.photoText}>✓ Photo selected</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, styles.addButton]}
        onPress={handleAddItem}
      >
        <Text style={styles.buttonText}>Add Item</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        📊 This example shows analytics integration
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#34C759',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoText: {
    textAlign: 'center',
    color: '#34C759',
    fontSize: 14,
    marginBottom: 12,
  },
  note: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
});
