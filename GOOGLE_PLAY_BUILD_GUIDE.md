# Google Play Store Build Guide - WhereIsIt Inventory

This guide covers building the Android app for Google Play Store submission.

## Prerequisites

- Node.js installed (v18 or higher)
- Java Development Kit (JDK) 17 or higher
- Android Studio (optional, but recommended)
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)

## Build Configuration Overview

The app is already configured with the following Play Store settings:

- **Package Name**: `com.whereisit.inventory`
- **Version Code**: 4
- **Version Name**: 1.0.2
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 34 (Android 14)

These values are configured in:
- `app.json` - Expo configuration
- `android/app/build.gradle` - Android build configuration

## Step 1: Generate Upload Keystore

Google Play requires all apps to be signed with a keystore. You need to generate an upload keystore:

```bash
# Navigate to the android/app directory
cd android/app

# Generate a new keystore (run this once)
keytool -genkeypair -v -storetype PKCS12 -keystore whereisit-upload-key.keystore -alias whereisit-key -keyalg RSA -keysize 2048 -validity 10000
```

When prompted, enter:
- **Keystore password**: Choose a strong password and save it securely
- **Key password**: Can be the same as keystore password
- **First and Last Name**: Your name or company name
- **Organizational Unit**: Your department (optional)
- **Organization**: Your company name
- **City/Locality**: Your city
- **State/Province**: Your state
- **Country Code**: Two-letter country code (e.g., US)

**CRITICAL**: Store your keystore file and passwords securely! You cannot update your app without them.

### Recommended Keystore Password Storage

1. Store passwords in environment variables:
   ```bash
   export WHEREISIT_STORE_PASSWORD="your-keystore-password"
   export WHEREISIT_KEY_PASSWORD="your-key-password"
   ```

2. Add to your `.bashrc` or `.zshrc` for persistence (local development only)
3. For CI/CD, add as secrets in your GitHub repository or CI platform

## Step 2: Verify Build Configuration

The `android/app/build.gradle` file is already configured with:

```gradle
signingConfigs {
    release {
        storeFile file('whereisit-upload-key.keystore')
        storePassword System.getenv('WHEREISIT_STORE_PASSWORD') ?: 'TempPass123!'
        keyAlias 'whereisit-key'
        keyPassword System.getenv('WHEREISIT_KEY_PASSWORD') ?: 'TempPass123!'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled enableMinifyInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

## Step 3: Install Dependencies

```bash
# From the project root
npm install
# or
bun install
```

## Step 4: Build Release APK or AAB

### Option A: Build AAB (Recommended for Play Store)

Android App Bundle (AAB) is the recommended format for Google Play:

```bash
# From project root
cd android
./gradlew bundleRelease
```

The AAB will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Option B: Build APK (For testing or other stores)

```bash
# From project root
cd android
./gradlew assembleRelease
```

The APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Step 5: Build with EAS (Alternative Method)

If you prefer to use Expo Application Services (EAS):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS build
eas build:configure

# Build for Android
eas build --platform android --profile production
```

The `eas.json` configuration is already set up with production profile.

## Step 6: Test the Release Build

Before uploading to Play Store, test the release build:

```bash
# Install the APK on a physical device or emulator
adb install android/app/build/outputs/apk/release/app-release.apk

# Or install AAB using bundletool
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=app.apks
bundletool install-apks --apks=app.apks
```

## Step 7: Prepare for Play Store Submission

### Required Assets (See PLAY_STORE_LISTING.md for details)

1. **App Icon**: 512x512 PNG (already in `assets/images/icon.png`)
2. **Feature Graphic**: 1024x500 PNG
3. **Screenshots**: Minimum 2, maximum 8 (1080x1920 or 1080x2340)
4. **App Description**: See `PLAY_STORE_LISTING.md`
5. **Privacy Policy**: Link to hosted policy

### Privacy & Data Safety

Ensure you've reviewed:
- `PRIVACY_POLICY.md` - Privacy policy text
- Camera permissions usage
- Network data usage
- Local data storage

## Step 8: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing app
3. Navigate to "Release" → "Production" → "Create new release"
4. Upload your AAB file
5. Fill in release notes (see `PLAY_STORE_LISTING.md`)
6. Submit for review

## Build Troubleshooting

### Issue: "keystore file not found"

**Solution**: Ensure you've generated the keystore in `android/app/whereisit-upload-key.keystore`

### Issue: "Failed to find configured root"

**Solution**: Clean and rebuild:
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

### Issue: Build fails with "Execution failed for task ':app:minifyReleaseWithR8'"

**Solution**: Check `proguard-rules.pro` and ensure all necessary keep rules are in place

### Issue: "You need to use a different package name"

**Solution**: The package name `com.whereisit.inventory` must be unique on Google Play. If taken, modify in:
- `app.json` → `expo.android.package`
- `android/app/build.gradle` → `applicationId`
- `android/app/build.gradle` → `namespace`

## Version Management

When preparing a new release:

1. Update version in `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.3",
       "android": {
         "versionCode": 5
       }
     }
   }
   ```

2. Update in `android/app/build.gradle`:
   ```gradle
   versionCode 5
   versionName "1.0.3"
   ```

**Important**: `versionCode` must increase with each release (it's an integer). `versionName` is the user-facing version string.

## Security Best Practices

1. **Never commit keystore files to git** - Already in `.gitignore`
2. **Store passwords in environment variables** - Not in code
3. **Back up your keystore** - Store securely in multiple locations
4. **Enable Play App Signing** - Let Google manage your signing key (recommended)

## Continuous Integration (CI/CD)

For automated builds, add these secrets to your CI environment:
- `WHEREISIT_STORE_PASSWORD` - Keystore password
- `WHEREISIT_KEY_PASSWORD` - Key password
- Store the keystore file as a base64-encoded secret and decode during build

Example GitHub Actions workflow:
```yaml
- name: Decode keystore
  run: |
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/whereisit-upload-key.keystore
    
- name: Build AAB
  env:
    WHEREISIT_STORE_PASSWORD: ${{ secrets.WHEREISIT_STORE_PASSWORD }}
    WHEREISIT_KEY_PASSWORD: ${{ secrets.WHEREISIT_KEY_PASSWORD }}
  run: |
    cd android
    ./gradlew bundleRelease
```

## Google Play App Signing

Google recommends using Play App Signing where Google manages your app signing key:

1. Upload your first release with your upload keystore
2. Enroll in Play App Signing
3. Google generates and securely stores your app signing key
4. You continue to upload releases signed with your upload key
5. Google re-signs with the app signing key before distribution

Benefits:
- More secure
- Can reset upload key if compromised
- Optimized APK delivery

## Additional Resources

- [Android Build Documentation](https://developer.android.com/studio/build)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Expo Build Guide](https://docs.expo.dev/build/setup/)
- [App Signing Best Practices](https://developer.android.com/studio/publish/app-signing)

## Quick Reference Commands

```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore whereisit-upload-key.keystore -alias whereisit-key -keyalg RSA -keysize 2048 -validity 10000

# Build AAB for Play Store
cd android && ./gradlew bundleRelease

# Build APK for testing
cd android && ./gradlew assembleRelease

# Clean build
cd android && ./gradlew clean

# List tasks
cd android && ./gradlew tasks

# Build with EAS
eas build --platform android --profile production
```

## Checklist Before Submission

- [ ] Keystore generated and backed up securely
- [ ] Passwords stored in environment variables
- [ ] AAB/APK built successfully
- [ ] Release build tested on physical device
- [ ] App icons and assets prepared (512x512)
- [ ] Screenshots captured (minimum 2)
- [ ] Feature graphic created (1024x500)
- [ ] Privacy policy URL accessible
- [ ] Play Store listing text ready (see PLAY_STORE_LISTING.md)
- [ ] Version code incremented
- [ ] Release notes written
- [ ] All required permissions declared and explained
- [ ] Content rating questionnaire completed

---

**Last Updated**: February 2026
**App Version**: 1.0.2
**Build Tools**: Gradle 8.x, Android SDK 34
