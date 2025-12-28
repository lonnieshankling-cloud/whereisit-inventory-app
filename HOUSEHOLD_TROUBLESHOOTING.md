# Household Feature Diagnostic Guide

## Current Status
The household feature requires:
1. ✅ Backend running (Encore on port 4002)
2. ✅ Clerk authentication configured
3. ✅ Frontend code in place (SettingsScreen.tsx)
4. ❓ Auth token flow working end-to-end

## Quick Diagnosis Steps

### 1. Check if Backend is Running
```powershell
Get-NetTCPConnection -LocalPort 4002 -ErrorAction SilentlyContinue
```

If nothing shows up, start it:
```powershell
cd backend
encore run --port=4002
```

### 2. Check Mobile App Environment
Look at `.env.local`:
- Should point to correct backend URL
- For Android Emulator: `http://10.0.2.2:4002`
- For device on same network: `http://YOUR_LAN_IP:4002`
- For cloud staging: `https://staging-whereisit-inventory-app-9xhi.encr.app`

### 3. Test Household Creation Flow

#### From Mobile App:
1. Open app and sign in with Clerk
2. Go to Settings → Household
3. Try to create a household
4. Watch logs in:
   - Expo console (look for `[API] Using base URL:` and any errors)
   - Encore backend terminal (look for `[Household] Creating household for user:`)

#### Expected Behavior:
- **Success:** Alert "Household created!" appears, household info loads
- **Auth fail:** Alert shows "unauthenticated" or "invalid token"
- **Network fail:** Alert shows "request failed" or "fetch failed"

## Common Issues & Fixes

### Issue 1: "Internal error occurred"
**Cause:** Backend can't verify Clerk token
**Fix:**
```powershell
# Check if Clerk secret is set
cd backend
encore secret list ClerkSecretKey

# If not set, set it (you'll be prompted to enter the secret):
encore secret set --type local ClerkSecretKey
```

### Issue 2: "Request failed" or can't connect
**Cause:** Mobile app can't reach backend
**Fix:**
- If using emulator: Use `http://10.0.2.2:4002` in `.env.local`
- If using device: Use your LAN IP (run `ipconfig` to find it)
- Make sure backend is running and listening on the right port

### Issue 3: "Unauthenticated" error
**Cause:** No auth token or invalid token
**Fix:**
1. Check Expo logs for `[Auth] Token synced after sign-in`
2. Sign out and sign back in
3. Check Settings screen for "Signed in" status

### Issue 4: Falls back to staging/prod cloud
**Cause:** App detects localhost on device
**Fix:**
- Either use staging cloud (it should work now with Clerk secret)
- Or use Android Emulator with `10.0.2.2` URL

## Testing with Staging Cloud

If local backend is problematic, test with staging:

1. Update `.env.local`:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://staging-whereisit-inventory-app-9xhi.encr.app
   ```

2. Restart Expo:
   ```powershell
   npx expo start -c
   ```

3. Reload app and try creating household

4. If it fails, check Encore Cloud dashboard for logs:
   - Go to: encore.dev/app
   - Select "whereisit-inventory-app-9xhi"
   - Go to "Logs" tab
   - Filter by "household" or "auth"

## Current Configuration

### Backend (backend/household/create.ts):
- Auth required: ✅ Yes (`auth: true`)
- Uses Clerk token verification via `getAuthData()`
- Logs: `[Household] Creating household for user:` on start
- Logs: `[Household] Created successfully:` on success
- Logs: `[Household] Creation failed:` on error

### Frontend (app/screens/SettingsScreen.tsx):
- Checks if user is signed in before creating
- Syncs auth token before API call
- Shows detailed error message in alert

### API Client (services/api.ts):
- Auto-injects Bearer token from AsyncStorage
- Falls back to staging if localhost on device
- Logs base URL and token presence

## Next Steps to Fix

1. **Start backend locally:**
   ```powershell
   cd backend
   encore run --port=4002
   ```

2. **Update .env.local** for your setup (emulator vs device)

3. **Restart Expo with clean cache:**
   ```powershell
   npx expo start -c
   ```

4. **Sign in on mobile app** (Settings → Sign In)

5. **Try creating household** (Settings → Household → Create)

6. **Share these logs:**
   - Expo console output (especially `[API]` and `[Auth]` lines)
   - Encore backend output (especially `[Household]` lines)
   - Any error alerts shown in the app

This will help diagnose exactly where the issue is!
