# Plan: Refine AddItemScreen

## 1. Component Overview
`AddItemScreen` is a complex modal for adding items to the inventory. It integrates:
- **Camera / Image Capture**: Main photo + Receipt photo.
- **Barcode Scanning**: Lookup via `itemApi`.
- **AI Analysis**: `MobileShelfAnalyzer`.
- **Data Persistence**: `databaseService` (SQLite).
- **Analytics**: Logging events.

## 2. Current State Analysis
- **State Management**: Uses ~20 individual `useState` hooks.
- **Dependencies**: Tightly coupled with `databaseService`, `api`, `Analytics`.
- **UI Structure**: specific sub-components (`MobileCamera`, `MobileShelfAnalyzer`) and a large `ScrollView` form.

## 3. Refinement Opportunities
### Code Quality
- [ ] **State Consolidation**: Group related fields (name, description, quantities) into a single form state object or use `react-hook-form`.
- [ ] **Hook Extraction**: Move logic for "Saving" and "Barcode Handling" into `useAddItemLogic` custom hook to clean up the view.
- [ ] **Type Safety**: Ensure `DetectedItem` and database types are strictly shared.

### User Experience
- [ ] **Validation Feedback**: Improve inline validation for required fields (Name).
- [ ] **Loading States**: Verify `isSaving` blocks all interactions correctly.
- [ ] **Keyboard Handling**: Ensure `KeyboardAvoidingView` works smoothly with the ScrollView on both platforms.

### Performance
- [ ] **Image Optimization**: Verify images are compressed/resized before saving to DB (`local_photo_uri`).
- [ ] **Memoization**: Check if callbacks (`handleSave`, `handleBarcodeScanned`) need `useCallback`.

## 4. Implementation Plan
1.  **Refactor Form State**: Consolidate text inputs.
2.  **Extract Hooks**: Separate logic from UI.
3.  **Verify Camera/Permissions**: Ensure robust permission handling.
4.  **Test**: Verify "Add Item" flow offline and online.
