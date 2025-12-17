# Copilot Instructions for whereisit-inventory-app

## Architecture snapshot
- Mobile app in `app/` uses Expo + expo-router (file-based routes); Clerk auth wired in `app/_layout.tsx`, syncing Clerk tokens to SecureStore/AsyncStorage and API auth via `services/api.ts`.
- Offline-first data for shopping lists: `services/databaseService` (SQLite) + `services/shoppingListService.ts` (write locally, sync when online, last-write-wins from server).
- API access should flow through `services/api.ts` (`getApiClient`, `householdApi`, etc.) which injects bearer tokens and resolves base URL (falls back to Encore cloud env when mobile is on-device).
- Encore TypeScript backend in `backend/` (auth/household/item/location/shopping/storage/...); run with `encore run`. Generated client lives in `frontend/client.ts` and is consumed by the mobile app—regenerate with `encore gen client --target leap` after backend shape changes.
- Web admin/dashboard lives in `frontend/` (Vite + Clerk + Radix + Tailwind). Backend build script bundles this into `backend/frontend/dist`.

## Environment & secrets
- Copy `.env.example` to `.env.local`; set `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_BACKEND_URL` (avoid localhost on physical devices), and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Backend expects Gemini/Google Vision creds (see `backend/google-vision-key.json` placeholder) and matching secret for GeminiApiKey. Auth token stored under `@whereisit_auth_token` via SecureStore/AsyncStorage.

## Day-to-day workflows
- Install deps with `bun install` at repo root (workspace). Expo can also work with `npm install` if bun unavailable.
- Mobile dev: `npx expo start` (helpers: `start-expo.bat`, `restart-expo.ps1` on Windows). Platform builds: `npm run android` / `npm run ios`.
- Backend dev: `cd backend && bun install && encore run` (requires Encore CLI). Regenerate API client after service changes: `encore gen client --target leap`.
- Web frontend: `cd frontend && bun install && npx vite dev`.
- Tests: `cd backend && bun run test`; `cd frontend && bun run test`.

## Patterns & guardrails
- Always use the generated client via `getApiClient()`; add new endpoint helpers in `services/api.ts` to keep auth/base URL logic centralized.
- After Clerk sign-in, call `setAuthToken` with the bearer from `useAuth().getToken`; clear with `clearAuthToken` on sign-out to keep API client state consistent.
- For offline flows, follow `ShoppingListService`—update SQLite first, sync when online, and expose sync state through listeners for UI indicators.
- Routing: modal routes and stacks are defined in `app/_layout.tsx`; place new screens under `app/` following expo-router conventions.
- Media/AI: shelf analysis uses Gemini key; image processing via Expo Image Manipulator; barcode scanning components live under `components/BarCodeScanner*` and `components/MobileCamera.tsx`.
- Deployment/release references: `PLAY_STORE_LISTING.md` for store prep, `CONTAINER_REGISTRY_SETUP.md` for container builds, `DEVELOPMENT.md` for backend + sync overview, analytics/billing setup in corresponding `*_SETUP.md` guides.
