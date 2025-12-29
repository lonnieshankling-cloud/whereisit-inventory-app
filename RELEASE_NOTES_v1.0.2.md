# WhereIsIt Inventory App - Version 1.0.2

## What's New

### 🎉 Enhanced Household Invitations
- **Email Invitations**: Invite household members via email! They'll receive a beautifully formatted invitation with a one-click join link
- **Invitation Codes**: Share unique household codes with family and friends for easy joining without email
- **Improved Reliability**: Fixed authentication issues when sending invitations

### 🔧 Bug Fixes & Improvements
- Fixed issue where household invitations weren't displaying correctly
- Improved authentication token handling for more stable connections
- Enhanced error messages and debugging capabilities
- Better handling of new user sign-ups

### 🔐 Security & Privacy
- Added comprehensive Privacy Policy for transparency
- Improved security for production builds
- Better protection of user data during household operations

### ⚡ Performance
- Optimized backend communication for faster response times
- Reduced authentication-related errors
- Improved app stability on startup

---

## For Play Store Listing

**What's New in 1.0.2:**

🎉 **Household Invitations Made Easy**
Invite family and friends to your household via email or shareable invitation codes! Recipients can join with a single tap.

🔧 **Reliability Improvements**
Fixed authentication issues, improved error handling, and enhanced overall app stability.

🔐 **Privacy & Security**
Added comprehensive privacy policy and improved data protection throughout the app.

---

## Technical Notes (Internal)

### Backend Changes
- Integrated Resend email service for household invitations
- Added invitation code generation and validation system
- Fixed `getInvitations` endpoint to properly filter by household_id
- Implemented automatic user record creation on first authentication
- Added auth token refresh before critical household operations

### Mobile App Changes
- Configured production signing with upload keystore
- Updated default backend environment to production
- Fixed Hermes/React Native compatibility for generated API client
- Bumped version code from 2 to 4 for Play Store requirements

### Infrastructure
- Added GPL-3.0 license with protective terms
- Enhanced logging for debugging household and auth flows
- Improved error handling and user feedback
