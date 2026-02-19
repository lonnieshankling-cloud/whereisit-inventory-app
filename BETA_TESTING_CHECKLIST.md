## 🧪 Beta Testing Checklist (Play Store Internal Testing)

### ✅ 1) Build & Versioning
- [ ] Confirm `version` and `android.versionCode` bumped in `app.json`.
- [ ] Ensure `expo-updates` configuration is correct (if used).
- [ ] Run `eas build -p android --profile preview` (or your internal profile).
- [ ] Verify the build targets the correct app ID / package name.

### ✅ 2) Play Console Setup
- [ ] Internal testing track created and active.
- [ ] Upload the new AAB.
- [ ] Release name and notes added (short, clear, user‑facing).
- [ ] Save and review → **Rollout** to internal testers.

### ✅ 3) Tester Access
- [ ] Tester list updated (emails or Google Groups).
- [ ] Share the opt‑in link with testers.
- [ ] Confirm testers can download from Play Store.

### ✅ 4) Authentication & Environments
- [ ] App points to correct backend environment (no `localhost`).
- [ ] Confirm auth works (Clerk sign‑in/out).
- [ ] Verify token storage and API calls succeed after relaunch.

### ✅ 5) Core Flows (Smoke Test)
- [ ] Launch → Home loads without errors.
- [ ] Create / view / update a key item.
- [ ] Offline flow: create an item offline, then sync when online.
- [ ] Background sync completes (no duplicate entries).

### ✅ 6) Permissions & Device Behavior
- [ ] Camera permission prompts show and work.
- [ ] Barcode scan flow works.
- [ ] Image upload / analysis works (if enabled).
- [ ] No crashes on rotate / resume / background.

### ✅ 7) Analytics & Logging
- [ ] Critical events fire (login, item created, scan success).
- [ ] Error tracking shows no new critical issues.

### ✅ 8) Store Readiness
- [ ] App icon / screenshots / description updated (if changed).
- [ ] Privacy Policy and Terms links valid in app + store listing.

### ✅ 9) Feedback Loop
- [ ] Provide testers with a feedback channel.
- [ ] Log all bugs with device + OS version.
- [ ] Decide go/no‑go for production rollout.

---

## ✅ Final Notes
- Internal testing is for fast validation—keep the scope tight.
- If a blocker appears, fix → rebuild → re‑upload to the same track.
