import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

interface CreateContainerRequest {
  name: string;
  locationId: number;
}

export interface Container {
  id: number;
  name: string;
  locationId: number | null;
  photoUrl: string | null;
}

export const create = api<CreateContainerRequest, Container>(
  { expose: true, method: "POST", path: "/containers", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const householdId = await ensureUserHasHousehold(userId);

    const container = await db.queryRow<{
      id: number;
      name: string;
      location_id: number;
      photo_url: string | null;
    }>`
      INSERT INTO containers (user_id, household_id, name, location_id)
      VALUES (${userId}, ${householdId}, ${req.name}, ${req.locationId})
      RETURNING id, name, location_id, photo_url
    `;

    if (!container) {
      throw new Error("Failed to create container");
    }

    return {
      id: container.id,
      name: container.name,
      locationId: container.location_id,
      photoUrl: container.photo_url,
    };
  }
);

interface ListByLocationRequest {
  locationId: string;
}

interface ListByLocationResponse {
  containers: Container[];
}

export const listByLocation = api<
  ListByLocationRequest,
  ListByLocationResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/locations/:locationId/containers",
    auth: true,
  },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const containers = await db.queryAll<{
      id: number;
      name: string;
      location_id: number;
      photo_url: string | null;
    }>`
      SELECT id, name, location_id, photo_url
      FROM containers
      WHERE location_id = ${parseInt(req.locationId, 10)} AND user_id = ${userId}
    `;

    return {
      containers: containers.map((c) => ({
        id: c.id,
        name: c.name,
        locationId: c.location_id,
        photoUrl: c.photo_url,
      })),
    };
  }
);

interface ListAllResponse {
  containers: (Container & { locationName: string | null })[];
}

interface UpdateContainerRequest {
  id: string;
  name?: string;
  locationId?: number;
  photoUrl?: string;
}

interface UpdateContainerResponse {
  container: Container;
}

export const list = api<void, ListAllResponse>(
  { expose: true, method: "GET", path: "/containers", auth: true },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const householdId = await ensureUserHasHousehold(userId);

    const containers = await db.queryAll<{
      id: number;
      name: string;
      location_id: number | null;
      location_name: string | null;
      photo_url: string | null;
    }>`
      SELECT c.id, c.name, c.location_id, l.name as location_name, c.photo_url
      FROM containers c
      LEFT JOIN locations l ON c.location_id = l.id
      WHERE c.household_id = ${householdId}
      ORDER BY l.name, c.name
    `;

    return {
      containers: containers.map((c) => ({
        id: c.id,
        name: c.name,
        locationId: c.location_id,
        locationName: c.location_name,
        photoUrl: c.photo_url,
      })),
    };
  }
);

interface DeleteContainerRequest {
  id: string;
}

export const deleteContainer = api<DeleteContainerRequest, void>(
  { expose: true, method: "DELETE", path: "/containers/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const householdId = await ensureUserHasHousehold(userId);

    const containerId = parseInt(req.id, 10);

    await db.exec`
      DELETE FROM containers
      WHERE id = ${containerId} AND household_id = ${householdId}
    `;
  }
);

export const update = api<UpdateContainerRequest, UpdateContainerResponse>(
  { expose: true, method: "PUT", path: "/containers/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const householdId = await ensureUserHasHousehold(userId);

    const containerId = parseInt(req.id, 10);

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (req.name !== undefined) {
      updateFields.push(`name = $${updateValues.length + 1}`);
      updateValues.push(req.name);
    }

    if (req.locationId !== undefined) {
      updateFields.push(`location_id = $${updateValues.length + 1}`);
      updateValues.push(req.locationId);
    }

    if (req.photoUrl !== undefined) {
      updateFields.push(`photo_url = $${updateValues.length + 1}`);
      updateValues.push(req.photoUrl);
    }

    if (updateFields.length === 0) {
      const container = await db.queryRow<{
        id: number;
        name: string;
        location_id: number | null;
        photo_url: string | null;
      }>`
        SELECT id, name, location_id, photo_url
        FROM containers
        WHERE id = ${containerId} AND household_id = ${householdId}
      `;

      if (!container) {
        throw new Error("Container not found");
      }

      return {
        container: {
          id: container.id,
          name: container.name,
          locationId: container.location_id,
          photoUrl: container.photo_url,
        },
      };
    }

    const query = `
      UPDATE containers
      SET ${updateFields.join(", ")}
      WHERE id = $${updateValues.length + 1} AND household_id = $${updateValues.length + 2}
      RETURNING id, name, location_id, photo_url
    `;

    updateValues.push(containerId, householdId);

    const container = await db.queryRow<{
      id: number;
      name: string;
      location_id: number | null;
      photo_url: string | null;
    }>(query as any, ...updateValues);

    if (!container) {
      throw new Error("Container not found or update failed");
    }

    return {
      container: {
        id: container.id,
        name: container.name,
        locationId: container.location_id,
        photoUrl: container.photo_url,
      },
    };
  }
);
