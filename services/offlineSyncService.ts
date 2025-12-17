import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineItem {
  id: string;
  name: string;
  description?: string;
  container_id?: string;
  photo_url?: string;
  quantity?: number;
  barcode?: string;
  synced: boolean;
  local_photo_uri?: string;
}

const SYNC_QUEUE_KEY = '@whereisit_sync_queue';
const MAX_RETRIES = 3;

export class OfflineSyncService {
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  async initialize() {
    // Load sync queue from storage
    await this.loadSyncQueue();
    
    // Start monitoring network state
    this.startNetworkMonitoring();
  }

  private async loadSyncQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueJson) {
        this.syncQueue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private startNetworkMonitoring() {
    // Check network state periodically
    setInterval(async () => {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected && networkState.isInternetReachable && !this.isSyncing) {
        this.processSyncQueue();
      }
      
      // Notify listeners
      const isOnline = !!(networkState.isConnected && networkState.isInternetReachable);
      this.listeners.forEach(listener => listener(isOnline));
    }, 10000); // Check every 10 seconds
  }

  async isOnline(): Promise<boolean> {
    const networkState = await Network.getNetworkStateAsync();
    return !!(networkState.isConnected && networkState.isInternetReachable);
  }

  onNetworkChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async queueOperation(
    type: SyncQueueItem['type'],
    endpoint: string,
    data: any
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(item);
    await this.saveSyncQueue();

    // Try to sync immediately if online
    if (await this.isOnline()) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const online = await this.isOnline();
      if (!online) {
        this.isSyncing = false;
        return;
      }

      // Process items one at a time
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue[0];

        try {
          await this.syncItem(item);
          // Success - remove from queue
          this.syncQueue.shift();
          await this.saveSyncQueue();
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          item.retryCount++;

          if (item.retryCount >= MAX_RETRIES) {
            // Max retries exceeded - remove from queue and log
            console.error(`Max retries exceeded for item ${item.id}, removing from queue`);
            this.syncQueue.shift();
            await this.saveSyncQueue();
          } else {
            // Keep in queue for retry
            break;
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    // Get auth token from storage
    const token = await AsyncStorage.getItem('@whereisit_auth_token');
    
    const response = await fetch(`${item.endpoint}`, {
      method: this.getHttpMethod(item.type),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  }

  private getHttpMethod(type: SyncQueueItem['type']): string {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        return 'POST';
    }
  }

  async getSyncQueueSize(): Promise<number> {
    return this.syncQueue.length;
  }

  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  // Helper method to save auth token
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('@whereisit_auth_token', token);
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('@whereisit_auth_token');
  }

  async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('@whereisit_auth_token');
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService();
