# Agent Instructions: whereisit-inventory-app

## 🏗 Project Architecture
- **Monorepo Structure**:
  - `app/`: React Native (Expo) mobile application using file-based routing.
  - `backend/`: Encore.dev TypeScript backend services.
  - `frontend/`: Vite + React web admin dashboard.
  - `services/`: Shared mobile services (API, DB, Sync).
- **Core Stacks**: Expo Router, Clerk (Auth), SQLite (Local DB), Encore (Backend), Gemini/Google Vision (AI).

## 🔄 Data Flow & State
- **Authentication**:
  - Clerk handles identity in `app/_layout.tsx`.
  - Token is synced to `AsyncStorage` (`@whereisit_auth_token`) via `setAuthToken` in `services/api.ts`.
  - **Critical**: Always use `getApiClient()` in `services/api.ts` for backend calls; it auto-injects the token and handles environment resolution (Local vs Cloud).
- **Offline-First (Mobile)**:
  - Pattern defined in `services/shoppingListService.ts`.
  - Reads/Writes always go to SQLite (`services/databaseService.ts`) first.
  - Background sync pushes changes when online (`last-write-wins` strategy).
- **Backend Communication**:
  - Uses Encore-generated client at `frontend/client.ts`.
  - Mobile app imports this client directly.

## 🛠 Developer Workflows & Commands
- **Dependency Management**:
  - Root: `npm install` (Standard for Expo workspace).
  - Backend/Frontend: `bun install` (Preferred for speed/compatibility with Encore scripts).
- **Running the Stack**:
  - Mobile: `npx expo start` (or `start-expo.bat`).
  - Backend: `cd backend && encore run`.
  - Web: `cd frontend && npx vite dev`.
- **Code Generation**:
  - After changing backend schema: `cd backend && encore gen client --target leap` to update `frontend/client.ts`.
- **Testing**:
  - Backend/Frontend: `vitest`.
  - Mobile: Manual testing via Expo Go or Simulators.

## 🧩 Key Patterns & Conventions
- **Routing**: Define screens in `app/`. Configure modal stacks/tabs in `app/_layout.tsx`.
- **API Extension**: Do not use `fetch` directly. Add helper methods in `services/api.ts` wrapping the generated client for consistent error handling and auth.
- **AI Integration**:
  - Shelf Analysis: Uses Gemini (Key in `.env`, implementation in `components/MobileShelfAnalyzer.tsx`).
- **Environment**:
  - Copy `.env.example` to `.env.local`.
  - Set `EXPO_PUBLIC_BACKEND_URL` to your Encore endpoint (avoid `localhost` on physical devices).
  - Backend requires `google-vision-key.json` for Vision API features.

## 📂 Important Files
- `app/_layout.tsx`: Auth state listener, token syncing, and Navigation root.
- `services/api.ts`: API Client factory, Auth token management, & Environment resolution.
- `services/databaseService.ts`: SQLite schema definitions & query logic.
- `backend/encore.app`: Backend service definition.
- `frontend/client.ts`: Generated type-safe API client (shared).
