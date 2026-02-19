# RevenueCat Testing Guide (Android)

This guide covers how to test in-app purchases (IAP) locally, on emulators, and with mock data.

## 🚀 Quick Summary
1.  **UI Testing**: Use the new **Mock Mode** in the premium helpers to toggle Premium on/off instantly without touching Google Play.
2.  **Real Purchase Testing**: Requires "Sandbox" mode. This involves Google Play Console setup, a specific build signature, and a physical device or Google Play-enabled emulator.

---

## 🛠 Option 1: Mocking for UI Testing (Fastest)

If you just want to test if the "Premium" features unlock correctly (e.g., unlimited items, removed ads), you don't need real billing.

We have added a `Mock Mode` to `utils/premium.ts`.

### How to use Mock Mode
You can toggle this programmatically in your code or add a hidden button in your settings screen.

```typescript
import { activatePremium, deactivatePremium } from '@/utils/premium';

// Force Premium ON
activatePremium();

// Force Premium OFF (Free Tier)
deactivatePremium();
```

*Note: This setting resets when the app restarts.*

---

## 📱 Option 2: Real Sandbox Testing (The "Right" Way)

To test the actual flow (Credit Card pop-up, RevenueCat verifying entitlement), you must use RevenueCat's Sandbox environment.

### Prerequisites
1.  **Google Play Console Account**: You must have access to the dashboard.
2.  **Physical Device or Emulator with Google Play**: The standard "Android Emulator" often lacks the Play Store. Create a new AVD in Android Studio and ensure the "Play Store" icon is present next to the system image name.

### Step 1: Setup Google Play Console
1.  Upload your `.aab` (Application Bundle) to the **Internal Testing** track in Google Play Console.
    *   *You do not need to submit for review!* Just uploading to "Draft" is often enough to register the `applicationId`.
    *   **Crucial**: The `applicationId` in `app.json` (`com.whereisit.inventory`) must match the one in Play Console.
2.  Add your email to **License Testers**.
    *   Go to **Setup > License testing**.
    *   Add the Gmail account you use on your test device/emulator.
    *   Set "License response" to `RESPOND_NORMALLY`.

### Step 2: Sign Your Local Build
Google Play Billing only works if the app running on your phone has the **same signature** as the one uploaded to the Play Store.

1.  If you are using Expo Go (`npx expo start`), billing **WILL NOT WORK**.
2.  You must build a "Development Build" or run from local native code.
3.  **Keystore Match**:
    *   If you uploaded an AAB signed by Expo EAS to the Play Store, you usually cannot reproduce that signature locally easily unless you download the keystore.
    *   **Workaround**: Use **Internal App Sharing**.
        1.  Build your APK/AAB locally: `eas build --profile development --platform android --local`.
        2.  Or use `npx expo run:android`.
        3.  Note: Billing often fails with the debug keystore (`debug.keystore`).
        4.  **Best Practice**: Build a preview APK using EAS (`eas build -p android --profile preview`), download it, and install it on the device.

### Step 3: Test the Purchase
1.  Open the app on the device logged in with the License Tester Gmail account.
2.  Trigger a purchase.
3.  You should see "This is a test order, you will not be charged."
4.  If you see "The item you requested is not available for purchase":
    *   The `productId` in RevenueCat/Play Console doesn't match the code.
    *   The app signature doesn't match the Play Store version.
    *   The tester account is not added to the Testing Track.

---

## 🔍 Troubleshooting Checklist

**1. "Error connecting to billing service"**
*   **Cause**: Emulator doesn't have Play Store or you are not logged in.
*   **Fix**: Check Android Studio AVD Manager for the Play Store icon. Open Play Store app on emulator and login.

**2. "Item not found"**
*   **Cause**: Product ID mismatch or delayed propagation.
*   **Fix**: Check `utils/premium.ts` -> `getOfferings()`. Ensure you have mapped the Play Store Product ID to a RevenueCat Entitlement/Offering regarding the *current* flavor.

**3. verifying API Keys**
*   Go to `app/_layout.tsx`, enable debug logs for RevenueCat:
    ```typescript
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    ```
*   View logs in terminal (`npx expo start`) or Logcat (`adb logcat -s "Purchases"`).
*   Watch for `[Purchases] - DEBUG: application is active` or any auth errors.

---

## 🤖 Automating UI Tests (Mocking)
For integration tests (e.g., Maestro, Detox), you can inject the mock state at launch.

Since the premium helpers are module-level functions, you can add a temporary button in `AnalyticsDebugScreen.tsx` to toggle mock modes during manual testing.
