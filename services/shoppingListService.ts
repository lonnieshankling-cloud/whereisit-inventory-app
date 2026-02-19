import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { getApiClient } from './api';
import { databaseService, LocalShoppingItem } from './databaseService';

const AUTH_TOKEN_KEY = '@whereisit_auth_token';

interface BackendShoppingItem {
  id: number;
  userId: string;
  itemName: string;
  quantity: number;
  addedAt: string;
  isPurchased: boolean;
  addedByUserId: string;
  addedByEmail: string;
  householdId: number;
  updatedAt: string;
}

export class ShoppingListService {
  private isSyncing = false;
  private syncListeners: Set<() => void> = new Set();

  async initialize() {
    await databaseService.initialize();
  }

  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  private async isOnline(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return !!(networkState.isConnected && networkState.isInternetReachable);
    } catch {
      return false;
    }
  }

  onSyncStateChange(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifySyncListeners() {
    this.syncListeners.forEach(listener => listener());
  }

  /**
   * Get all shopping list items (local only)
   */
  async getShoppingList(): Promise<LocalShoppingItem[]> {
    return await databaseService.getShoppingList();
  }

  /**
   * Add item to shopping list (with backend sync)
   */
  async addItem(itemName: string, quantity: number = 1): Promise<void> {
    // Add to local database first
    await databaseService.addToShoppingList(itemName, quantity);

    // Try to sync with backend
    if (await this.isOnline()) {
      const token = await this.getAuthToken();
      if (token) {
        try {
          const client = await getApiClient();
          await client.shopping.add({ itemName, quantity });

          // Update local item as synced
          const localItems = await databaseService.getShoppingList();
          const localItem = localItems.find(
            (item) =>
                item.item_name === itemName &&
                item.quantity === quantity &&
                item.synced === 0
          );
          if (localItem) {
            await databaseService.updateShoppingItem(localItem.id, {
                synced: 1,
            });
          }
        } catch (error) {
          console.warn('Failed to sync add to backend:', error);
          // Continue - item is in local database
        }
      }
    }
  }

  /**
   * Update shopping list item (with backend sync)
   */
  async updateItem(
    id: string,
    updates: { quantity?: number; is_purchased?: number }
  ): Promise<void> {
    await databaseService.updateShoppingItem(id, updates);

    // Try to sync with backend
    if (await this.isOnline()) {
      const token = await this.getAuthToken();
      if (token) {
        try {
          const client = await getApiClient();
          const backendUpdates: any = { id: id as any };
          if (updates.quantity !== undefined) {
            backendUpdates.quantity = updates.quantity;
          }
          if (updates.is_purchased !== undefined) {
            backendUpdates.isPurchased = updates.is_purchased === 1;
          }

          // Note: Using local ID for now - in production, need to map local to backend IDs
          await client.shopping.update(backendUpdates);
          await databaseService.updateShoppingItem(id, { synced: 1 });
        } catch (error) {
          console.warn('Failed to sync update to backend:', error);
          // Continue - item is updated locally
        }
      }
    }
  }

  /**
   * Delete shopping list item (with backend sync)
   */
  async deleteItem(id: string): Promise<void> {
    // Try to sync deletion with backend first
    if (await this.isOnline()) {
      const token = await this.getAuthToken();
      if (token) {
        try {
          const client = await getApiClient();
          await client.shopping.deleteItem({ id: id as any });
        } catch (error) {
          console.warn('Failed to sync delete to backend:', error);
          // Continue with local deletion
        }
      }
    }

    // Delete from local database
    await databaseService.deleteShoppingItem(id);
  }

  /**
   * Clear all purchased items (with backend sync)
   */
  async clearPurchasedItems(): Promise<void> {
    const items = await databaseService.getShoppingList();
    const purchasedItems = items.filter((item) => item.is_purchased === 1);

    // Try to sync deletions with backend
    if (await this.isOnline()) {
      const token = await this.getAuthToken();
      if (token) {
        try {
          const client = await getApiClient();
          for (const item of purchasedItems) {
            try {
              await client.shopping.deleteItem({ id: item.id as any });
            } catch (error) {
              console.warn(`Failed to sync delete of item ${item.id}:`, error);
              // Continue with local deletion
            }
          }
        } catch (error) {
           console.warn(`Failed to initialize client for bulk delete:`, error);
        }
      }
    }

    // Delete from local database
    await databaseService.clearPurchasedItems();
  }

  /**
   * Sync shopping list with backend (pull changes from server)
   */
  async syncWithBackend(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    const token = await this.getAuthToken();
    if (!token || !(await this.isOnline())) {
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners();

    try {
      const client = await getApiClient();
      // Fetch all items from backend
      const data = await client.shopping.list();

      // Get local items
      const localItems = await databaseService.getShoppingList();
      const localItemsMap = new Map(localItems.map((item) => [item.item_name, item]));

      // Sync backend items to local database
      for (const backendItem of data.items) {
        const localItem = localItemsMap.get(backendItem.itemName);

        if (!localItem) {
          // Item exists on backend but not locally - add it
          await databaseService.addToShoppingList(
            backendItem.itemName,
            backendItem.quantity
          );
          // Update to match backend state
          const newLocalItems = await databaseService.getShoppingList();
          const newLocalItem = newLocalItems.find(
            (item) => item.item_name === backendItem.itemName
          );
          if (newLocalItem) {
            await databaseService.updateShoppingItem(newLocalItem.id, {
              is_purchased: backendItem.isPurchased ? 1 : 0,
              synced: 1,
            });
          }
        } else {
          // Item exists both locally and on backend
          // Use backend as source of truth (last-write-wins from server)
          const backendUpdatedAt = new Date(backendItem.updatedAt).getTime();
          const localUpdatedAt = localItem.updated_at;

          if (backendUpdatedAt > localUpdatedAt) {
            // Backend is newer - update local
            await databaseService.updateShoppingItem(localItem.id, {
              quantity: backendItem.quantity,
              is_purchased: backendItem.isPurchased ? 1 : 0,
              synced: 1,
            });
          }
        }

        localItemsMap.delete(backendItem.itemName);
      }

      // Remaining local items don't exist on backend
      // Push them to backend if not synced
      for (const [_, localItem] of localItemsMap) {
        if (localItem.synced === 0) {
          try {
            await client.shopping.add({
                itemName: localItem.item_name,
                quantity: localItem.quantity,
            });

            await databaseService.updateShoppingItem(localItem.id, {
              synced: 1,
            });
          } catch (error) {
            console.warn(`Failed to push local item ${localItem.id} to backend:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync shopping list with backend:', error);
      throw error;
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners();
    }
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const shoppingListService = new ShoppingListService();
