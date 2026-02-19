/**
 * Simple Analytics Utility
 * Tracks app usage locally with AsyncStorage
 * Easy to upgrade to Firebase Analytics or other services later
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSameMonth, parseISO } from 'date-fns';

const ANALYTICS_KEY = '@whereisit_analytics';
const MAX_EVENTS = 1000; // Keep last 1000 events

export interface AnalyticsEvent {
  event: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface AnalyticsStats {
  totalEvents: number;
  itemsAdded: number;
  itemsEdited: number;
  itemsDeleted: number;
  searches: number;
  photosTaken: number;
  barcodesScanned: number;
  shoppingItemsAdded: number;
  locationsCreated: number;
  firstUsed: string | null;
  lastUsed: string | null;
  daysActive: number;
  aiScansThisMonth: number;
}

class AnalyticsService {
  /**
   * Log an analytics event
   */
  async logEvent(event: string, data?: Record<string, any>): Promise<void> {
    try {
      // Always log to console in development
      if (__DEV__) {
        console.log('📊 Analytics:', event, data);
      }

      const events = await this.getEvents();
      
      events.push({
        event,
        timestamp: new Date().toISOString(),
        data,
      });

      // Keep only last MAX_EVENTS
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }

      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  /**
   * Get all stored events
   */
  async getEvents(): Promise<AnalyticsEvent[]> {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading analytics:', error);
      return [];
    }
  }

  /**
   * Get analytics statistics
   */
  async getStats(): Promise<AnalyticsStats> {
    const events = await this.getEvents();

    if (events.length === 0) {
      return {
        totalEvents: 0,
        itemsAdded: 0,
        itemsEdited: 0,
        itemsDeleted: 0,
        searches: 0,
        photosTaken: 0,
        barcodesScanned: 0,
        shoppingItemsAdded: 0,
        locationsCreated: 0,
        firstUsed: null,
        lastUsed: null,
        daysActive: 0,
        aiScansThisMonth: 0,
      };
    }

    // Count events by type
    const itemsAdded = events.filter(e => e.event === 'item_added').length;
    const itemsEdited = events.filter(e => e.event === 'item_edited').length;
    const itemsDeleted = events.filter(e => e.event === 'item_deleted').length;
    const searches = events.filter(e => e.event === 'search_performed').length;
    const photosTaken = events.filter(e => e.event === 'photo_taken').length;
    const barcodesScanned = events.filter(e => e.event === 'barcode_scanned').length;
    const shoppingItemsAdded = events.filter(e => e.event === 'shopping_item_added').length;
    const locationsCreated = events.filter(e => e.event === 'location_created').length;

    // Get date range
    const firstUsed = events[0]?.timestamp || null;
    const lastUsed = events[events.length - 1]?.timestamp || null;

    // Calculate days active
    let daysActive = 0;
    if (firstUsed && lastUsed) {
      const first = new Date(firstUsed);
      const last = new Date(lastUsed);
      daysActive = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Count AI scans in current month
    const now = new Date();
    const aiScansThisMonth = events.filter(e => 
      e.event === 'ai_scan_performed' && 
      isSameMonth(parseISO(e.timestamp), now)
    ).length;

    return {
      totalEvents: events.length,
      itemsAdded,
      itemsEdited,
      itemsDeleted,
      searches,
      photosTaken,
      barcodesScanned,
      shoppingItemsAdded,
      locationsCreated,
      firstUsed,
      lastUsed,
      daysActive,
      aiScansThisMonth,
    };
  }

  /**
   * Export events for debugging
   */
  async exportEvents(): Promise<AnalyticsEvent[]> {
    return await this.getEvents();
  }

  /**
   * Clear all analytics data
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ANALYTICS_KEY);
      console.log('Analytics data cleared');
    } catch (error) {
      console.error('Error clearing analytics:', error);
    }
  }

  /**
   * Get events for a specific date range
   */
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<AnalyticsEvent[]> {
    const events = await this.getEvents();
    return events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  /**
   * Get event counts by day
   */
  async getEventsByDay(days: number = 7): Promise<Record<string, number>> {
    const events = await this.getEvents();
    const counts: Record<string, number> = {};

    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      counts[dateKey] = 0;
    }

    events.forEach(event => {
      const dateKey = event.timestamp.split('T')[0];
      if (dateKey in counts) {
        counts[dateKey]++;
      }
    });

    return counts;
  }
}

// Export singleton instance
export const Analytics = new AnalyticsService();

// Convenience functions for common events
export const logEvent = (event: string, data?: Record<string, any>) => 
  Analytics.logEvent(event, data);

// Item events
export const logItemAdded = (category?: string, hasPhoto?: boolean) =>
  Analytics.logEvent('item_added', { category, hasPhoto });

export const logItemEdited = (itemId: string) =>
  Analytics.logEvent('item_edited', { itemId });

export const logItemDeleted = (itemId: string) =>
  Analytics.logEvent('item_deleted', { itemId });

export const logItemViewed = (itemId: string) =>
  Analytics.logEvent('item_viewed', { itemId });

// Search events
export const logSearchPerformed = (query: string, resultCount: number) =>
  Analytics.logEvent('search_performed', { query, resultCount });

// Photo events
export const logPhotoTaken = (source: 'camera' | 'gallery') =>
  Analytics.logEvent('photo_taken', { source });

export const logPhotoUploaded = () =>
  Analytics.logEvent('photo_uploaded');

// Barcode events
export const logBarcodeScanned = (type: string, success: boolean) =>
  Analytics.logEvent('barcode_scanned', { type, success });

// Shopping list events
export const logShoppingItemAdded = (itemName: string) =>
  Analytics.logEvent('shopping_item_added', { itemName });

export const logShoppingItemPurchased = (itemName: string) =>
  Analytics.logEvent('shopping_item_purchased', { itemName });

// Location events
export const logLocationCreated = (type: 'location' | 'container') =>
  Analytics.logEvent('location_created', { type });

export const logLocationViewed = (locationId: string) =>
  Analytics.logEvent('location_viewed', { locationId });

// Household events
export const logHouseholdCreated = () =>
  Analytics.logEvent('household_created');

export const logMemberInvited = () =>
  Analytics.logEvent('member_invited');

export const logInvitationAccepted = () =>
  Analytics.logEvent('invitation_accepted');

// Feature usage
export const logAnalyticsViewed = () =>
  Analytics.logEvent('analytics_viewed');

export const logLowStockAlertTriggered = (itemCount: number) =>
  Analytics.logEvent('low_stock_alert_triggered', { itemCount });

export const logBulkOperationPerformed = (operation: string, itemCount: number) =>
  Analytics.logEvent('bulk_operation_performed', { operation, itemCount });

// Screen views
export const logScreenView = (screenName: string) =>
  Analytics.logEvent('screen_view', { screenName });

// App lifecycle
export const logAppOpened = () =>
  Analytics.logEvent('app_opened');

export const logAppClosed = () =>
  Analytics.logEvent('app_closed');
