/**
 * Centralized API client with automatic auth token injection
 * All API calls should go through this to ensure proper authentication
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Config } from '../config';
import Client, { Environment } from '../frontend/client';

const AUTH_TOKEN_KEY = '@whereisit_auth_token';

// Determine which environment to use
export const getBaseURL = () => {
  const explicit = Config.BACKEND_URL?.trim();
  const isDevice = Platform.OS !== 'web';

  if (explicit) {
    if (isDevice && (explicit.includes('localhost') || explicit.includes('127.0.0.1'))) {
      console.warn('[API] Localhost backend in env on device, falling back to cloud env (staging)');
      return Environment('staging');
    }
    return explicit;
  }

  // Default to production environment for released builds
  let base = Environment('production');

  // Safety: if something resolved to localhost on a device (shouldn't for production), override to production
  if (isDevice && (base.includes('localhost') || base.includes('127.0.0.1'))) {
    console.warn('[API] Localhost base detected on device, falling back to cloud env (production)');
    base = Environment('production');
  }

  return base;
};

let loggedBase = false;

/**
 * Get the stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Save the auth token
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

/**
 * Clear the auth token (logout)
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

/**
 * Get an authenticated API client
 * This automatically injects the auth token into all requests
 */
export async function getApiClient(): Promise<Client> {
  const token = await getAuthToken();
  const base = getBaseURL();

  // Log once to confirm which base URL the app is using
  if (!loggedBase) {
    console.log('[API] Using base URL:', base);
    console.log('[API] Auth token present:', Boolean(token));
    loggedBase = true;
  }

  const client = new Client(base, {
    auth: token ? { authorization: token } : undefined,
  });

  return client;
}

/**
 * Household API wrapper with proper error handling
 */
export const householdApi = {
  /**
   * Get the current user's household
   */
  async get() {
    const client = await getApiClient();
    return await client.household.get();
  },

  /**
   * Get household members
   */
  async getMembers() {
    const client = await getApiClient();
    return await client.household.getMembers();
  },

  /**
   * Get pending invitations (sent by this household)
   */
  async getInvitations() {
    const client = await getApiClient();
    return await client.household.getInvitations();
  },

  /**
   * Get pending invitations (received by current user)
   */
  async getPendingInvitations() {
    const client = await getApiClient();
    return await client.household.getPendingInvitations();
  },

  /**
   * Create a new household
   */
  async create(name: string) {
    const client = await getApiClient();
    return await client.household.create({ name });
  },

  /**
   * Invite a member to the household
   */
  async invite(email: string) {
    const client = await getApiClient();
    return await client.household.invite({ invited_email: email });
  },

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: number) {
    const client = await getApiClient();
    return await client.household.resendInvitation({ invitation_id: invitationId });
  },

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: number) {
    const client = await getApiClient();
    return await client.household.cancelInvitation({ invitation_id: invitationId });
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: number) {
    const client = await getApiClient();
    return await client.household.acceptInvitation({ invitation_id: invitationId });
  },

  /**
   * Accept an invitation by code
   */
  async acceptInvitationByCode(code: string) {
    const client = await getApiClient();
    return await client.household.acceptInvitationByCode({ invitation_code: code });
  },

  /**
   * Remove a member from the household (owner only)
   */
  async removeMember(userId: string) {
    const client = await getApiClient();
    return await client.household.removeMember({ user_id: userId });
  },

  /**
   * Leave the household (non-owners only)
   */
  async leave() {
    const client = await getApiClient();
    return await client.household.leave();
  },

  /**
   * Rename the household
   */
  async rename(name: string) {
    const client = await getApiClient();
    return await client.household.rename({ name });
  },
};

/**
 * Item API wrapper for inventory interactions
 */
export const itemApi = {
  /**
   * Look up an item by barcode
   */
  async lookup(barcode: string) {
    const client = await getApiClient();
    return await client.item.lookupBarcode({ upc: barcode });
  },

  /**
   * List all items
   */
  async list() {
    const client = await getApiClient();
    return await client.item.search({ query: '' });
  },

  /**
   * Create a new item
   */
  async create(data: { name: string; barcode?: string; description?: string; location_id?: number }) {
    const client = await getApiClient();
    return await client.item.create(data);
  },

  /**
   * Update an item
   */
  async update(itemId: number, data: any) {
    const client = await getApiClient();
    return await client.item.update({ id: itemId, ...data });
  },

  /**
   * Delete an item
   */
  async delete(itemId: number) {
    const client = await getApiClient();
    return await client.item.deleteItem({ id: itemId });
  },
};
