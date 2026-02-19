# WhereIsIt Inventory App 📦

A comprehensive mobile inventory management system built with Expo and React Native. Track your items, manage locations, scan barcodes, analyze shelves with AI, and never lose track of your belongings again.

## Features

- 📱 **Mobile-First Design**: Built with Expo for iOS and Android
- 📦 **Item Management**: Add, edit, delete, and track items with photos
- 📍 **Location Tracking**: Organize items by containers and locations
- 🔍 **Smart Search**: Quickly find items with powerful search
- 📊 **Analytics Dashboard**: View stats, low stock alerts, and insights
- 🛒 **Shopping Lists**: Integrated shopping list with sync
- 📷 **Barcode Scanner**: Scan items for quick entry
- 🤖 **AI Shelf Analysis**: Use Google Vision AI to analyze shelf photos
- 📱 **Offline Support**: Works offline with SQLite database
- 🔄 **Bulk Operations**: Multi-select and bulk actions
- 🏷️ **Low Stock Alerts**: Get notified when items run low

## Tech Stack

- **Frontend**: React Native, Expo SDK 54, expo-router
- **Database**: SQLite (local), PostgreSQL (backend)
- **Backend**: Encore.dev framework
- **AI/ML**: Google Gemini, Google Vision API
- **UI**: lucide-react-native icons, custom components

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

## Release checklist (Play Store)

**Package Name:** `com.whereisit.inventory` ← Use this exact package name in Google Play Console (NOT a URL). See [GOOGLE_PLAY_PACKAGE_NAME.md](./GOOGLE_PLAY_PACKAGE_NAME.md) for details.

- Set `EXPO_PUBLIC_BACKEND_URL` in `.env` to your public HTTPS backend (no localhost/LAN).
- Bump `expo.version` and `expo.android.versionCode` in `app.json`.
- Build a release: `eas build -p android --profile production` (or `npx expo run:android --variant release` if you prebuild).
- Test the release build on-device: household flows, camera/photo, AI calls against the production backend.
- Confirm icons/splash/name and privacy policy/Data Safety answers are ready for Play Console.
- See [PLAY_STORE_LISTING.md](./PLAY_STORE_LISTING.md) for complete submission guide.

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## License

This project is licensed under the **GNU General Public License v3.0 with Additional Terms**.

### Key Points:

- ✅ **Free to use** for personal and educational purposes
- ✅ **Open source** contributions welcome
- ✅ **Must share modifications** under the same license
- ❌ **Commercial redistribution** requires permission
- ❌ **Cannot republish** to app stores without permission
- ❌ **Trademark protected**: "WhereIsIt Inventory" name reserved

### Additional Terms:

1. **Commercial Use**: Requires explicit written permission
2. **App Store Distribution**: Prohibited under different name/account
3. **Backend Services**: Not included in license grant
4. **Trademark**: Branding and name protected

For commercial licensing or permissions, contact: support@whereisit-inventory.com

See [LICENSE](LICENSE) file for full terms.

## Privacy

See our [Privacy Policy](PRIVACY_POLICY.md) for information about data collection and usage.

## Copyright

Copyright (C) 2025 Lonnie Shankling. All rights reserved.
