import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { Location } from "./create";

interface ContainerItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
}

interface Container {
  id: number;
  name: string;
  items: ContainerItem[];
}

interface UnplacedItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
}

interface LocationWithDetails extends Location {
  containers: Container[];
  unplacedItems: UnplacedItem[];
}

interface ListLocationsResponse {
  locations: LocationWithDetails[];
  containers: { id: number; name: string; locationId: number | null; photoUrl: string | null }[];
}

// Retrieves all locations for the user.
export const list = api<void, ListLocationsResponse>(
  { expose: true, method: "GET", path: "/locations", auth: true },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const user = await db.queryRow<{ household_id: number | null }>`
      SELECT household_id FROM users WHERE id = ${userId}
    `;

    if (!user || !user.household_id) {
      return { locations: [], containers: [] };
    }

    const [locations, containersRaw, allItems] = await Promise.all([
      db.queryAll<{
        id: number;
        name: string;
        user_id: string;
        created_at: Date;
      }>`
        SELECT id, name, user_id, created_at
        FROM locations
        WHERE household_id = ${user.household_id}
        ORDER BY name ASC
      `,
      db.queryAll<{ id: number; name: string; location_id: number | null; photo_url: string | null }>`
        SELECT id, name, location_id, photo_url
        FROM containers
        WHERE household_id = ${user.household_id}
        ORDER BY name ASC
      `,
      db.queryAll<{
        id: number;
        name: string;
        description: string | null;
        quantity: number;
        location_id: number | null;
        container_id: number | null;
      }>`
        SELECT id, name, description, quantity, location_id, container_id
        FROM items
        WHERE household_id = ${user.household_id}
        ORDER BY name ASC
      `
    ]);

    const itemsByContainer: Record<number, ContainerItem[]> = {};
    const unplacedItemsByLocation: Record<number, UnplacedItem[]> = {};

    for (const item of allItems) {
      if (item.container_id !== null) {
        if (!itemsByContainer[item.container_id]) {
          itemsByContainer[item.container_id] = [];
        }
        itemsByContainer[item.container_id].push({
          id: item.id,
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
        });
      } else if (item.location_id !== null) {
        if (!unplacedItemsByLocation[item.location_id]) {
          unplacedItemsByLocation[item.location_id] = [];
        }
        unplacedItemsByLocation[item.location_id].push({
          id: item.id,
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
        });
      }
    }

    const containersByLocation: Record<number, Container[]> = {};
    for (const containerRaw of containersRaw) {
      if (containerRaw.location_id !== null) {
        if (!containersByLocation[containerRaw.location_id]) {
          containersByLocation[containerRaw.location_id] = [];
        }
        containersByLocation[containerRaw.location_id].push({
          id: containerRaw.id,
          name: containerRaw.name,
          items: itemsByContainer[containerRaw.id] || [],
        });
      }
    }

    const locationsWithDetails: LocationWithDetails[] = locations.map((location) => ({
      id: location.id,
      name: location.name,
      userId: location.user_id,
      createdAt: location.created_at,
      containers: containersByLocation[location.id] || [],
      unplacedItems: unplacedItemsByLocation[location.id] || [],
    }));

    return {
      locations: locationsWithDetails,
      containers: containersRaw.map((c) => ({
        id: c.id,
        name: c.name,
        locationId: c.location_id,
        photoUrl: c.photo_url,
      })),
    };
  }
);
