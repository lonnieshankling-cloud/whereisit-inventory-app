# GitHub Actions Build Setup Guide

This guide walks through setting up the automated Android and web builds in GitHub Actions.

## Prerequisites

- EAS CLI installed: `npm install -g eas-cli`
- Authenticated with EAS: `eas login`
- Expo account active

## Step 1: Create GitHub Secrets

Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

### Required Secret: `EAS_TOKEN`

This token allows GitHub Actions to authenticate with EAS Build service.

**How to generate:**

```bash
# Option 1: Use existing token from EAS Dashboard
# Visit: https://expo.dev/settings/tokens
# Create new personal access token with "build" and "submit" scopes

# Option 2: Generate via CLI (if not already authenticated)
eas login
eas whoami  # This shows your currently logged-in user
```

**Then add to GitHub:**
1. Go to `https://github.com/lonnieshankling-cloud/whereisit-inventory-app/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `EAS_TOKEN`
4. Value: Your token from above
5. Click "Add secret"

### Optional Secrets for Direct Play Store Submission

If you want to auto-submit to Play Store internal testing:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: Service account JSON key (base64 encoded or JSON string)
- `ANDROID_KEYSTORE_PASSWORD`: Release keystore password
- `ANDROID_KEY_PASSWORD`: Release key password

For now, these are **not required** for internal testing builds.

## Step 2: Verify EAS Configuration (Local)

Ensure your local EAS credentials are set up:

```bash
# Verify you're logged in
eas whoami

# Check EAS keystore status
eas credentials

# Expected output should show project:
# Project: 30985138-385a-403d-a952-9e215848faa0 (WhereIsItMobile)
#
# Android:
#   Keystore:
#     [Managed by EAS]
```

If Android keystore is not managed by EAS yet, run:

```bash
eas credentials
# Select: Set up build credentials
# Platform: Android
# Generate keystore (or use existing)
```

## Step 3: Configure Android Signing (One-Time)

The app uses two Android signing profiles:

### Debug Signing (for development)
- Auto-managed by Gradle
- Uses `android/app/debug.keystore` (checked into repo for dev convenience)

### Release Signing (for production/testing)
- Stored in EAS Managed Credentials
- Reference in `eas.json`:
  ```json
  "production": {
    "autoIncrement": true,
    ...
  }
  ```

**Verify keystore is stored with EAS:**
```bash
eas credentials
# Should show Android Keystore as "Managed by EAS" or list the keystore path
```

## Step 4: Test a Manual Build (Optional)

Before automating, test one build locally:

```bash
# Build for internal testing using EAS
eas build --platform android --profile internal --wait

# Or with preview profile
eas build --platform android --profile preview --wait
```

This ensures:
1. Your EAS token works
2. Keystore signing is configured correctly
3. Dependencies resolve properly

## Step 5: Trigger Automated Builds

Once secrets and EAS are configured, the workflows will run automatically on:

- **Push to main**: Triggers Android (internal) + Web builds
- **Push to release/* branch**: Triggers Android (preview) + Web builds
- **Pull requests to main**: Triggers Android (internal) + Web builds
- **Manual trigger**: Visit Actions tab → "Build Android App" → "Run workflow" → Select profile

## Monitoring Builds

### GitHub Actions Dashboard
- URL: `https://github.com/lonnieshankling-cloud/whereisit-inventory-app/actions`
- See all workflow runs, logs, and downloaded artifacts

### EAS Dashboard
- URL: `https://expo.dev/projects/30985138-385a-403d-a952-9e215848faa0/builds`
- See detailed build logs, signing status, and download built AABs

### Artifacts
- Built web app: Download `web-build-<commit-sha>` artifact containing `/dist/` folder
- Android AAB: Available via EAS Dashboard (not directly in GitHub artifacts yet)

## Troubleshooting

### Build fails with "EAS_TOKEN not found"
- Ensure secret is spelled exactly `EAS_TOKEN`
- Verify it's added to repository (not organization) secrets

### Build fails with "Keystore error" or "Signing failed"
- Run locally: `eas credentials`
- Ensure Android signing keystore is managed by EAS
- May need to regenerate: `eas credentials --platform android`

### Build times out
- EAS builds can take 10-20 minutes
- GitHub Actions default timeout is 6 hours
- Check EAS Dashboard for build progress

### Web build fails with "dist/ not found"
- Ensure `expo export --platform web` runs successfully locally:
  ```bash
  cd /your/project
  npx expo export --platform web
  ```
- If successful locally but fails in CI, check Node version in workflow (currently 20)

## Configuration Files Reference

- **Workflows**: `.github/workflows/build-android.yml`, `.github/workflows/build-web.yml`
- **EAS Config**: `eas.json` (profiles: internal, preview, production)
- **App Config**: `app.json` (version, permissions, plugins)
- **Gradle Config**: `android/gradle.properties` (signing config variables)

## Next Steps

1. ✅ Add `EAS_TOKEN` to GitHub Secrets
2. ✅ Verify EAS credentials locally (`eas credentials`)
3. ✅ Push workflow files to main branch
4. ✅ Trigger manual build via Actions tab to test
5. ✅ Download and verify build artifacts
6. **(Future)** Set up Play Store submission workflow
7. **(Future)** Configure iOS TestFlight builds

