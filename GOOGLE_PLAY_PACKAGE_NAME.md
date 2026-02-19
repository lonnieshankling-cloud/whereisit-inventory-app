# Google Play Package Name

## ✅ Correct Package Name

**Package Name:** `com.whereisit.inventory`

Use this **exact** package name when submitting to Google Play Console.

## ❌ Common Mistake

**INCORRECT:** `https://play.google.com/store/apps/details?id=com.whereisit.inventory`

**CORRECT:** `com.whereisit.inventory`

> **Note:** Google Play Console asks for the package name, NOT the full Play Store URL. Only enter the package ID portion.

## 📍 Where This Package Name is Defined

The package name `com.whereisit.inventory` is consistently defined in:

### 1. app.json (Expo Configuration)
```json
{
  "expo": {
    "android": {
      "package": "com.whereisit.inventory"
    },
    "ios": {
      "bundleIdentifier": "com.whereisit.inventory"
    }
  }
}
```
**Location:** Line 21 of `/app.json`

### 2. Android build.gradle
```gradle
android {
    namespace 'com.whereisit.inventory'
    defaultConfig {
        applicationId 'com.whereisit.inventory'
    }
}
```
**Location:** Lines 90 and 92 of `/android/app/build.gradle`

## 📋 Google Play Console Submission

When submitting to Google Play Console:

### Step 1: Create App
1. Go to https://play.google.com/console
2. Click "Create app"
3. Enter app details

### Step 2: App Details
When asked for **"Package name"** or **"Application ID"**:
- ✅ **Enter:** `com.whereisit.inventory`
- ❌ **Don't enter:** Full URL or Play Store link

### Step 3: Verify Package Name
After creating the app, verify:
- Package name matches: `com.whereisit.inventory`
- This cannot be changed once the app is published

## 🔍 How to Find Package Name

If you ever need to verify the package name:

### Option 1: Check app.json
```bash
cat app.json | grep '"package"'
```
Output: `"package": "com.whereisit.inventory",`

### Option 2: Check build.gradle
```bash
cat android/app/build.gradle | grep 'applicationId'
```
Output: `applicationId 'com.whereisit.inventory'`

### Option 3: Check built APK/AAB
```bash
aapt dump badging app-release.aab | grep package
```
Output: `package: name='com.whereisit.inventory'`

## 📱 App Information

- **App Name:** WhereIsIt Inventory
- **Package Name:** com.whereisit.inventory
- **Version Code:** 4 (auto-increments)
- **Version Name:** 1.0.2

## 🚨 Important Notes

1. **Cannot be changed:** Once published to Play Store, the package name is permanent
2. **Must be unique:** No other app on Google Play can have the same package name
3. **Format:** Reverse domain notation (e.g., com.company.app)
4. **Case-sensitive:** Use exact lowercase format: `com.whereisit.inventory`

## ✅ Quick Reference Card

```
╔══════════════════════════════════════════════════╗
║  Google Play Package Name                        ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  com.whereisit.inventory                         ║
║                                                  ║
║  (Copy this exactly when submitting to           ║
║   Google Play Console)                           ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

## 📝 Related Files

- `app.json` - Expo configuration
- `android/app/build.gradle` - Android build configuration
- `PLAY_STORE_LISTING.md` - Play Store listing details
- `eas.json` - EAS Build configuration

## 🔗 Helpful Links

- [Google Play Console](https://play.google.com/console)
- [Android Package Name Guidelines](https://developer.android.com/studio/build/application-id)
- [Expo Application Identifier](https://docs.expo.dev/versions/latest/config/app/#package)

---

**Last Updated:** February 5, 2026

**Questions?** Check `/PLAY_STORE_LISTING.md` for complete Play Store submission guide.
