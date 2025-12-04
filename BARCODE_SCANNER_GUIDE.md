# Barcode Scanner Integration Guide

## Overview
This app now uses `expo-camera` v17's built-in barcode scanning capabilities instead of the deprecated `expo-barcode-scanner`. This provides better compatibility with Expo SDK 54 and modern Android/iOS versions.

## Files Created
- **`components/BarCodeScanner.tsx`** - Reusable barcode scanner component with camera view
- **`components/BarCodeScannerExample.tsx`** - Example usage showing how to integrate the scanner

## Features
- ✅ Scans all major barcode formats (QR, UPC, EAN, Code128, etc.)
- ✅ Visual feedback with corner markers
- ✅ Haptic feedback on successful scan
- ✅ Permission handling with user-friendly prompts
- ✅ Auto-reset after scan (allows multiple scans)
- ✅ Full-screen modal presentation
- ✅ Works on both Android and iOS

## Supported Barcode Types
- QR Code
- EAN-13, EAN-8
- UPC-A, UPC-E
- Code 39, Code 93, Code 128
- Codabar
- ITF-14
- Aztec
- Data Matrix
- PDF417

## How to Use in Your App

### Basic Usage
```tsx
import { useState } from 'react';
import { Modal, Button } from 'react-native';
import BarCodeScanner from '@/components/BarCodeScanner';

export default function YourScreen() {
  const [showScanner, setShowScanner] = useState(false);

  const handleBarCodeScanned = (data: string, type: string) => {
    console.log('Scanned:', data, type);
    // Do something with the scanned data
    setShowScanner(false);
  };

  return (
    <>
      <Button 
        title="Scan Barcode" 
        onPress={() => setShowScanner(true)} 
      />
      
      <Modal visible={showScanner} animationType="slide">
        <BarCodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </>
  );
}
```

### Integration Example - Item Search
```tsx
// In your items list or search screen
const handleScanForItem = (barcode: string, type: string) => {
  // Search for item by barcode
  const item = items.find(i => i.barcode === barcode);
  
  if (item) {
    // Navigate to item detail
    router.push(`/items/${item.id}`);
  } else {
    Alert.alert('Not Found', 'No item found with this barcode');
  }
};
```

### Integration Example - Add Item with Barcode
```tsx
// In your add item screen
const [barcode, setBarcode] = useState('');
const [showScanner, setShowScanner] = useState(false);

const handleBarCodeScanned = (data: string, type: string) => {
  setBarcode(data);
  setShowScanner(false);
  
  // Optional: Look up product info from barcode API
  // fetchProductInfo(data);
};

return (
  <View>
    <TextInput 
      value={barcode} 
      onChangeText={setBarcode}
      placeholder="Barcode"
    />
    <Button 
      title="Scan Barcode" 
      onPress={() => setShowScanner(true)} 
    />
    
    <Modal visible={showScanner}>
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        onClose={() => setShowScanner(false)}
      />
    </Modal>
  </View>
);
```

## Camera Permissions
Already configured in `app.json`:
```json
{
  "expo-camera": {
    "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to scan barcodes and capture images of items.",
    "microphonePermission": false,
    "recordAudioAndroid": false
  }
}
```

## Customization

### Change Scan Behavior
To allow continuous scanning without the 2-second delay:
```tsx
// In BarCodeScanner.tsx, remove the timeout:
const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
  Vibration.vibrate(100);
  onBarCodeScanned(data, type);
  // Removed: setTimeout(() => setScanned(false), 2000);
};
```

### Limit Barcode Types
To only scan specific formats:
```tsx
<CameraView
  barcodeScannerSettings={{
    barcodeTypes: ['qr', 'ean13', 'upc_a'], // Only these formats
  }}
  // ...
/>
```

### Change Scan Area Size
Adjust the scan area in styles:
```tsx
scanArea: {
  top: '25%',  // Move up/down
  left: '5%',  // Wider/narrower
  right: '5%',
  height: 300, // Taller/shorter
},
```

## Testing
1. Run the dev server: `npx expo start`
2. Open the app on your device (not simulator for camera)
3. Navigate to a screen with barcode scanning
4. Tap "Scan Barcode"
5. Grant camera permission when prompted
6. Point camera at any barcode/QR code

## Building for Production
The barcode scanner is now using `expo-camera` which is already in your dependencies, so it will build successfully:

```bash
eas build --platform android --profile production
```

No additional configuration needed - the camera plugin is already set up!

## Troubleshooting

### Camera permission not granted
- Check that `expo-camera` plugin is in `app.json`
- Rebuild the app after adding permissions
- On iOS: Check Info.plist has NSCameraUsageDescription
- On Android: Check AndroidManifest.xml has CAMERA permission

### Scanner not detecting barcodes
- Ensure good lighting
- Hold device steady and at proper distance
- Check that barcode type is in `barcodeTypes` array
- Some simulators don't support camera - test on real device

### Build fails
- Run `npx expo prebuild --clean` to regenerate native folders
- Ensure `expo-camera` version is compatible with your Expo SDK
- Check that no conflicting barcode scanner packages are installed

## Migration from expo-barcode-scanner
If you previously used `expo-barcode-scanner`, the main changes are:

| Old | New |
|-----|-----|
| `import { BarCodeScanner }` | `import { CameraView }` |
| `<BarCodeScanner onBarCodeScanned={...} />` | `<CameraView onBarcodeScanned={...} />` |
| `barCodeTypes` | `barcodeScannerSettings.barcodeTypes` |
| Always required permission | Built into expo-camera |

## Next Steps
1. ✅ Test the scanner on a physical device
2. Add barcode field to your items database
3. Integrate scanner into item creation flow
4. Add barcode-based item search
5. Consider adding barcode lookup API (UPC Database, Open Food Facts, etc.)
