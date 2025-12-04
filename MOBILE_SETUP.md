# WhereIsIt Mobile - Development Guide

## 🚀 Quick Start

### 1. Start the Backend (Encore)

```powershell
cd c:\Users\lshan\WhereIsItMobile\backend
$env:GOOGLE_APPLICATION_CREDENTIALS = "c:\Users\lshan\WhereIsItMobile\backend\google-vision-key.json"
encore run
```

**Backend runs on:** `http://localhost:4000`

### 2. Start the Mobile App (Expo)

```powershell
cd c:\Users\lshan\WhereIsItMobile
npx expo start
```

Then choose:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## 📱 Features Ready to Test

### ✅ Working Features

1. **Offline-First Architecture**
   - All data saved to SQLite locally
   - Auto-syncs when internet available
   - Works completely offline

2. **Add Items**
   - Tap "+ Add" button on home screen
   - Take photo with camera
   - Scan barcode (13 types supported)
   - Fill in item details
   - Save (works offline!)

3. **View Items**
   - Tap on item count stat card
   - See all saved items with photos
   - Pull down to refresh
   - Shows sync status badges

4. **Native Features**
   - Camera with front/back toggle
   - Gallery picker
   - Barcode scanner with haptic feedback
   - Network status monitoring
   - Offline mode banner

## 🗂️ Database Structure (SQLite)

The app uses local SQLite database with these tables:

- **items** - Item details, photos, barcodes, purchase info
- **containers** - Storage containers/boxes
- **receipts** - Receipt photos linked to items

All tables have `synced` flag (0 = pending sync, 1 = synced)

## 🔄 Sync Queue System

When offline:
1. Changes saved to SQLite immediately
2. API calls queued in AsyncStorage
3. Queue processes automatically when online
4. Retry up to 3 times on failure
5. Network status checked every 10 seconds

## 🛠️ Next Development Steps

### Priority 1: Receipt OCR
Create `MobileReceiptScanner.tsx` component:
- Capture receipt photo
- Call Google Cloud Vision OCR
- Extract purchase date, price, store
- Auto-fill item details

### Priority 2: Shelf Analysis
Create `MobileShelfAnalyzer.tsx` component:
- Capture shelf photo
- Use Gemini AI to identify multiple items
- Batch create items from results

### Priority 3: Image Compression
Install and use `expo-image-manipulator`:
```bash
npx expo install expo-image-manipulator
```
- Compress images before upload
- Max 1200px width
- WebP format for smaller size

### Priority 4: Container Management
- Create containers screen
- Assign items to containers
- View container contents
- Container photos

### Priority 5: Build Configuration
Create `eas.json` for deployment:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

## 📦 Installed Packages

Mobile-specific:
- `expo-camera` v17.0.9 - Camera access
- `expo-barcode-scanner` v13.0.1 - ML Kit barcode scanning
- `expo-sqlite` v16.0.9 - Local database
- `expo-haptics` v15.0.7 - Haptic feedback
- `expo-network` v8.0.7 - Network state
- `expo-image-picker` v17.0.8 - Gallery access
- `@react-native-async-storage/async-storage` v2.2.0 - Key-value storage
- `lucide-react-native` v0.555.0 - Icons

## 🐛 Common Issues

### Backend won't start
```powershell
# Kill process on port 4000
$proc = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Select-Object -First 1
if ($proc) { Stop-Process -Id $proc -Force }

# Start Docker if needed
docker start 430dfadfbc66
```

### Camera permissions denied
Check `app.json` has camera permissions configured (already done)

### Database errors
Database initializes automatically on first app load. Check:
```javascript
// In app code
const stats = await databaseService.getStats();
console.log(stats); // Should show { items: 0, unsynced: 0, containers: 0 }
```

## 📱 Testing Checklist

- [ ] App starts without errors
- [ ] Can add item with photo
- [ ] Can scan barcode
- [ ] Item saves to database
- [ ] Item appears in list
- [ ] Turn off WiFi
- [ ] Add item offline
- [ ] See "Offline Mode" banner
- [ ] See "Pending Sync" count increase
- [ ] Turn on WiFi
- [ ] Items sync automatically
- [ ] Sync count goes to 0

## 🔐 Environment Variables

Backend needs:
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to google-vision-key.json
- `GeminiApiKey` - Set via `encore secret set GeminiApiKey`

Check secrets:
```bash
cd backend
encore secret list
```

## 📸 Screenshots to Capture

For app store submission:
1. Home screen with stats
2. Add item form
3. Camera view
4. Barcode scanner
5. Items list
6. Item detail view
7. Offline mode indicator

## 🎯 Success Metrics

App is ready for deployment when:
- ✅ All features work offline
- ✅ Sync works reliably
- ✅ No TypeScript errors
- ✅ Tested on iOS simulator
- ✅ Tested on Android emulator
- ✅ Tested on physical device
- ⏳ EAS Build configuration complete
- ⏳ App store assets ready

---

**Current Status:** Core features complete, ready for testing!
