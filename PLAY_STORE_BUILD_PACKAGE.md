# WhereIsIt Inventory - Google Play Store Build Package

## Overview

Your app is **fully configured** for Google Play Store submission. All necessary build.gradle files are in place and properly configured.

## What's Already Set Up

### ✅ Build Configuration Files

1. **android/build.gradle** - Root project build configuration
2. **android/app/build.gradle** - App module build configuration with:
   - Package name: `com.whereisit.inventory`
   - Version: 1.0.2 (code: 4)
   - Release signing configuration
   - Code minification and optimization
   - ProGuard rules

### ✅ App Configuration

- **app.json** - Expo configuration with Android settings
- **eas.json** - Build profiles for EAS builds
- **android/gradle.properties** - Build properties and optimization flags
- **android/settings.gradle** - Project structure configuration

### ✅ Android Resources

- App icons (adaptive icon with foreground, background, monochrome)
- Splash screen configuration
- Permissions properly declared
- AndroidManifest.xml configured

## What You Need To Do

### 1. Generate Upload Keystore (One-Time Setup)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore whereisit-upload-key.keystore \
  -alias whereisit-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Save the passwords securely!** You'll need them for every release.

### 2. Set Environment Variables

```bash
export WHEREISIT_STORE_PASSWORD="your-password"
export WHEREISIT_KEY_PASSWORD="your-password"
```

### 3. Install Dependencies

```bash
npm install
# or
bun install
```

### 4. Build for Play Store

**Option A: Build AAB (Recommended)**
```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Option B: Use EAS Build**
```bash
eas build --platform android --profile production
```

### 5. Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create or select your app
3. Upload the AAB file
4. Fill in store listing (see PLAY_STORE_LISTING.md)
5. Submit for review

## Build.Gradle Package Summary

Your build.gradle package includes:

```
android/
├── build.gradle                    # Root build file
├── settings.gradle                 # Project settings
├── gradle.properties              # Build properties
├── gradlew                        # Gradle wrapper (Unix)
├── gradlew.bat                    # Gradle wrapper (Windows)
└── app/
    ├── build.gradle               # App build configuration ⭐
    ├── proguard-rules.pro        # Code obfuscation rules
    └── src/main/
        └── AndroidManifest.xml    # App manifest
```

### Key Build.Gradle Configurations

**Package & Version:**
```gradle
namespace 'com.whereisit.inventory'
applicationId 'com.whereisit.inventory'
versionCode 4
versionName "1.0.2"
```

**Signing:**
```gradle
release {
    signingConfig signingConfigs.release
    minifyEnabled true
    shrinkResources true
}
```

**Compatibility:**
```gradle
minSdkVersion 23   (Android 6.0+)
targetSdkVersion 34  (Android 14)
```

## Documentation Files

- **BUILD_GRADLE_README.md** - Quick reference for build.gradle
- **GOOGLE_PLAY_BUILD_GUIDE.md** - Complete build instructions
- **PLAY_STORE_LISTING.md** - Store listing content
- **PRIVACY_POLICY.md** - Privacy policy text

## Verification Checklist

- [x] build.gradle files configured
- [x] Package name set (com.whereisit.inventory)
- [x] Version configured (1.0.2, code 4)
- [x] Signing configuration in place
- [x] Permissions declared
- [x] Icons and resources ready
- [ ] Upload keystore generated
- [ ] Dependencies installed
- [ ] Release build tested
- [ ] Play Store listing prepared

## Support & Resources

- **Build Issues**: See GOOGLE_PLAY_BUILD_GUIDE.md troubleshooting section
- **Store Listing**: Use content from PLAY_STORE_LISTING.md
- **Android Docs**: https://developer.android.com/studio/build
- **Play Console**: https://play.google.com/console

---

## Quick Start Commands

```bash
# 1. Generate keystore (one-time)
cd android/app && keytool -genkeypair -v -storetype PKCS12 \
  -keystore whereisit-upload-key.keystore -alias whereisit-key \
  -keyalg RSA -keysize 2048 -validity 10000

# 2. Set passwords
export WHEREISIT_STORE_PASSWORD="your-password"
export WHEREISIT_KEY_PASSWORD="your-password"

# 3. Install and build
cd ../.. && npm install
cd android && ./gradlew bundleRelease

# 4. Your AAB is ready at:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

**Status**: ✅ Ready for Play Store submission  
**Package**: `com.whereisit.inventory`  
**Version**: 1.0.2 (Build 4)  
**Last Updated**: February 2026
