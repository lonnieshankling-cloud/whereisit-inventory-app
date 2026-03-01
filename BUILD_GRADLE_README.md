# Build.Gradle Configuration Summary

This document summarizes the Google Play Store build.gradle configuration for WhereIsIt Inventory.

## Configuration Files

### Location
```
android/
├── build.gradle          (Root project configuration)
└── app/
    └── build.gradle      (App module configuration)
```

### Package Details

**Application ID**: `com.whereisit.inventory`  
**Namespace**: `com.whereisit.inventory`  
**Current Version**: 1.0.2  
**Version Code**: 4  

### Key Configuration Points

#### 1. Package Identifier (android/app/build.gradle)
```gradle
namespace 'com.whereisit.inventory'
applicationId 'com.whereisit.inventory'
```

#### 2. Version Information (android/app/build.gradle)
```gradle
versionCode 4
versionName "1.0.2"
```

#### 3. Release Signing (android/app/build.gradle)
Configured to use upload keystore for production releases:
- Keystore file: `whereisit-upload-key.keystore`
- Key alias: `whereisit-key`
- Passwords: Read from environment variables

#### 4. Build Optimizations
- Hermes JavaScript engine enabled
- New React Native architecture enabled
- R8 code optimization
- Resource shrinking
- ProGuard rules configured

## Quick Build Commands

Generate release AAB (Android App Bundle) for Play Store:
```bash
cd android
./gradlew bundleRelease
```

Output location: `android/app/build/outputs/bundle/release/app-release.aab`

Generate release APK for testing:
```bash
cd android
./gradlew assembleRelease
```

Output location: `android/app/build/outputs/apk/release/app-release.apk`

## Important Notes

1. **Keystore Required**: Before building release versions, generate the upload keystore
2. **Environment Variables**: Set `WHEREISIT_STORE_PASSWORD` and `WHEREISIT_KEY_PASSWORD`
3. **Version Management**: Increment `versionCode` for each Play Store release

## Complete Build Instructions

For detailed step-by-step instructions, see: [GOOGLE_PLAY_BUILD_GUIDE.md](./GOOGLE_PLAY_BUILD_GUIDE.md)

For Play Store listing details, see: [PLAY_STORE_LISTING.md](./PLAY_STORE_LISTING.md)
