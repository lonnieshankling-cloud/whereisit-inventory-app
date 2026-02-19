# Google Play Store Assets Checklist

You cannot publish your app without these assets. Google is strict about dimensions and format.

## 1. App Icon (Required)
- **File:** `store-icon.png` (You can use your existing `assets/images/icon.png` if strictly 512x512)
- **Format:** 32-bit PNG (with alpha)
- **Dimensions:** 512px by 512px
- **Max File Size:** 1024KB

## 2. Feature Graphic (Required)
This is the banner shown at the top of the store listing.
- **Format:** JPG or 24-bit PNG (no alpha)
- **Dimensions:** 1024px by 500px
- **Content:** Avoid text near borders; place key branding in the center.

## 3. Phone Screenshots (Required)
- **Quantity:** At least 2 screenshots, max 8.
- **Dimensions:** 
  - Ratio: 16:9 or 9:16 (Portrait)
  - Min dimension: 320px
  - Max dimension: 3840px
  - Recommended: 1080 x 1920 px
- **Suggested Screens:**
  1. Home Dashboard (Showing inventory summary)
  2. Item Detail View (Showing photo + details)
  3. Barcode Scanner (Action shot)
  4. Search/Filter screen
  5. Add Item Flow

## 4. 7-inch Tablet Screenshots (Required for Tablet Support)
Since your `app.json` says `"supportsTablet": true`, you *should* provide these to get the "Designed for Tablets" badge, though the app works without them it might impact discovery.
- **Quantity:** At least 2.
- **Recommendation:** Take screenshots of the app running on an iPad simulator or Android Tablet emulator.

## 5. 10-inch Tablet Screenshots (Optional but Recommended)
- Similar requirements to 7-inch.

---

## 🛠 How to Generate These
1. **Run the app locally:** `npx expo start`
2. **Open on Simulator/Emulator:** Press `a` for Android or `i` for iOS.
3. **Capture:**
   - **Android Emulator:** Click the Camera icon in the toolbar.
   - **iOS Simulator:** File > Save Screen (Cmd+S).
4. **Resize:** Use a tool like Figma, Canva, or Preview to ensure exact dimensions for the Feature Graphic.

## 🚀 Ready to Upload?
Go to [Google Play Console](https://play.google.com/console) -> **Main Store Listing**.
