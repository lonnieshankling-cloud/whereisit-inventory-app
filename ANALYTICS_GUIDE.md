# Analytics Implementation Guide

## Overview
Simple, privacy-first analytics system that tracks app usage locally. No external services required initially, easy to upgrade later.

## Features
✅ Local storage with AsyncStorage
✅ Privacy-first (no tracking servers)
✅ Easy to use convenience functions
✅ Built-in statistics and insights
✅ Debug dashboard for viewing data
✅ Export functionality for analysis
✅ Ready to upgrade to Firebase/Sentry later

## Files Created

1. **`utils/analytics.ts`** - Core analytics service
2. **`components/AnalyticsDebugScreen.tsx`** - Visual dashboard
3. **`app/analytics.tsx`** - Route to view analytics

## Quick Start

### 1. Import Analytics
```typescript
import { 
  logItemAdded, 
  logSearchPerformed, 
  logPhotoTaken 
} from '@/utils/analytics';
```

### 2. Track Events
```typescript
// When user adds an item
await logItemAdded('tools', true); // category, hasPhoto

// When user searches
await logSearchPerformed('hammer', 5); // query, resultCount

// When user takes photo
await logPhotoTaken('camera'); // source: 'camera' or 'gallery'
```

### 3. View Analytics
Navigate to `/analytics` route in your app to see the dashboard.

## Integration Examples

### Add Item Screen
```typescript
import { logItemAdded, logPhotoTaken } from '@/utils/analytics';

const handleAddItem = async (item: Item) => {
  try {
    // Your existing code to add item
    await database.addItem(item);
    
    // Track the event
    await logItemAdded(item.category, !!item.photoUri);
    
    // Success feedback
    Alert.alert('Success', 'Item added');
  } catch (error) {
    console.error(error);
  }
};

const handleTakePhoto = async () => {
  const result = await ImagePicker.launchCameraAsync();
  
  if (!result.canceled) {
    // Track photo taken
    await logPhotoTaken('camera');
    
    // Your code to handle photo
    setPhotoUri(result.assets[0].uri);
  }
};
```

### Search Screen
```typescript
import { logSearchPerformed } from '@/utils/analytics';

const handleSearch = async (query: string) => {
  const results = items.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase())
  );
  
  // Track search
  await logSearchPerformed(query, results.length);
  
  setSearchResults(results);
};
```

### Barcode Scanner
```typescript
import { logBarcodeScanned } from '@/utils/analytics';

const handleBarCodeScanned = async (data: string, type: string) => {
  // Track barcode scan
  await logBarcodeScanned(type, true);
  
  // Your code to handle barcode
  const item = await findItemByBarcode(data);
  
  if (item) {
    router.push(`/items/${item.id}`);
  } else {
    await logBarcodeScanned(type, false);
    Alert.alert('Not Found', 'No item with this barcode');
  }
};
```

### Shopping List
```typescript
import { logShoppingItemAdded, logShoppingItemPurchased } from '@/utils/analytics';

const addToShoppingList = async (itemName: string) => {
  await database.addShoppingItem(itemName);
  await logShoppingItemAdded(itemName);
};

const markPurchased = async (itemName: string) => {
  await database.markPurchased(itemName);
  await logShoppingItemPurchased(itemName);
};
```

### Screen Views (Optional)
```typescript
import { logScreenView } from '@/utils/analytics';
import { useEffect } from 'react';

export default function HomeScreen() {
  useEffect(() => {
    logScreenView('Home');
  }, []);
  
  // Your component code
}
```

## Available Functions

### Item Events
- `logItemAdded(category?, hasPhoto?)` - Item created
- `logItemEdited(itemId)` - Item updated
- `logItemDeleted(itemId)` - Item removed
- `logItemViewed(itemId)` - Item detail viewed

### Search Events
- `logSearchPerformed(query, resultCount)` - Search executed

### Photo Events
- `logPhotoTaken(source)` - Photo captured ('camera' or 'gallery')
- `logPhotoUploaded()` - Photo uploaded

### Barcode Events
- `logBarcodeScanned(type, success)` - Barcode scanned

### Shopping Events
- `logShoppingItemAdded(itemName)` - Added to shopping list
- `logShoppingItemPurchased(itemName)` - Marked as purchased

### Location Events
- `logLocationCreated(type)` - Location/container created
- `logLocationViewed(locationId)` - Location viewed

### Household Events
- `logHouseholdCreated()` - Household created
- `logMemberInvited()` - Member invited
- `logInvitationAccepted()` - Invitation accepted

### Feature Usage
- `logAnalyticsViewed()` - Analytics screen opened
- `logLowStockAlertTriggered(itemCount)` - Low stock alert shown
- `logBulkOperationPerformed(operation, itemCount)` - Bulk action

### Screen Tracking
- `logScreenView(screenName)` - Screen viewed

### App Lifecycle
- `logAppOpened()` - App launched
- `logAppClosed()` - App closed

### Generic Events
- `logEvent(eventName, data?)` - Custom event with data

## Analytics Dashboard

View your analytics at `/analytics` route:
- Total events count
- Days active
- Item statistics
- Feature usage
- Activity by day chart
- Usage period
- Export and clear options

## Programmatic Access

```typescript
import { Analytics } from '@/utils/analytics';

// Get statistics
const stats = await Analytics.getStats();
console.log('Items added:', stats.itemsAdded);

// Get events by date range
const events = await Analytics.getEventsByDateRange(
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

// Get daily activity
const dailyEvents = await Analytics.getEventsByDay(30); // Last 30 days

// Export all events
const allEvents = await Analytics.exportEvents();
console.log(allEvents);

// Clear all data
await Analytics.clearAll();
```

## Privacy Considerations

✅ **What This Tracks:**
- Feature usage (which features are used)
- Action counts (how many items added, etc.)
- Timestamps (when actions occur)
- General data (categories, search terms, etc.)

❌ **What This DOESN'T Track:**
- Personal information
- Specific item details (names, descriptions)
- Photos or images
- Location data
- Device information
- Network activity
- User identity

All data is stored **locally on device only**. Nothing is sent to external servers.

## Upgrading to External Services

### Option 1: Firebase Analytics
```typescript
// Install
npx expo install @react-native-firebase/app @react-native-firebase/analytics

// Replace in analytics.ts
import analytics from '@react-native-firebase/analytics';

async logEvent(event: string, data?: any) {
  // Keep local storage
  await this.logEventLocally(event, data);
  
  // Also send to Firebase
  await analytics().logEvent(event, data);
}
```

### Option 2: Sentry (Crash Reporting)
```typescript
// Install
npm install @sentry/react-native

// In app root
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_DSN',
  enableAutoSessionTracking: true,
});

// Track errors
try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Option 3: Mixpanel
```typescript
// Install
npm install mixpanel-react-native

// Initialize
import { Mixpanel } from 'mixpanel-react-native';

const mixpanel = await Mixpanel.init('YOUR_TOKEN');

// Track events
await mixpanel.track('item_added', { category: 'tools' });
```

## Best Practices

### DO:
✅ Track user actions, not personal data
✅ Use consistent event names
✅ Add useful context to events
✅ Track errors and failures
✅ Respect user privacy
✅ Make tracking optional (add settings toggle)

### DON'T:
❌ Track personal information
❌ Send data without user consent
❌ Track every single interaction
❌ Store sensitive data
❌ Block app functionality for analytics
❌ Slow down app with excessive tracking

## Performance Tips

1. **Batch Events**: Analytics writes are async and won't block UI
2. **Limit Storage**: Automatically keeps only last 1000 events
3. **Development Logging**: Events logged to console in dev mode
4. **Error Handling**: Failed analytics don't crash the app

## Testing

```typescript
// In your test file
import { Analytics } from '@/utils/analytics';

describe('Analytics', () => {
  beforeEach(async () => {
    await Analytics.clearAll();
  });

  it('tracks item added', async () => {
    await logItemAdded('tools', true);
    const stats = await Analytics.getStats();
    expect(stats.itemsAdded).toBe(1);
  });
});
```

## Debugging

```typescript
// Enable verbose logging
if (__DEV__) {
  // View all events
  const events = await Analytics.exportEvents();
  console.log('All Events:', events);
  
  // View stats
  const stats = await Analytics.getStats();
  console.log('Stats:', stats);
}
```

## Migration Path

**Phase 1 (Now)**: Local analytics only
**Phase 2 (Month 1)**: Add crash reporting (Sentry)
**Phase 3 (Month 2)**: Add external analytics (Firebase)
**Phase 4 (Month 3)**: Add user feedback tools

## Support

The analytics system is designed to be:
- **Silent**: Never interrupts user experience
- **Lightweight**: Minimal performance impact
- **Privacy-First**: No external tracking
- **Flexible**: Easy to extend or replace
- **Debuggable**: Built-in dashboard and export

## Next Steps

1. ✅ Test the analytics dashboard at `/analytics`
2. ✅ Add tracking to your main screens
3. ✅ Test a few events
4. ✅ View the dashboard to confirm tracking works
5. ✅ Add more events as needed
6. Later: Consider adding external analytics if needed

## Quick Integration Checklist

- [ ] Add `logItemAdded()` to item creation
- [ ] Add `logItemEdited()` to item updates
- [ ] Add `logItemDeleted()` to item deletion
- [ ] Add `logSearchPerformed()` to search
- [ ] Add `logPhotoTaken()` to camera
- [ ] Add `logBarcodeScanned()` to barcode scanner
- [ ] Add `logShoppingItemAdded()` to shopping list
- [ ] Add `logScreenView()` to major screens (optional)
- [ ] Test at `/analytics` route
- [ ] Add link to analytics in settings/debug menu
