import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

interface CreateLocationRequest {
  name: string;
}

export interface Location {
  id: number;
  userId: string;
  name: string;
  createdAt: Date;
}

// Creates a new location for organizing items.
export const create = api<CreateLocationRequest, Location>(
  { expose: true, method: "POST", path: "/locations", auth: true },
  async (req) => {
    if (!req.name || req.name.trim() === "") {
      throw APIError.invalidArgument("Location name cannot be empty");
    }

    const auth = getAuthData()!;
    const userId = auth.userID;

    const householdId = await ensureUserHasHousehold(userId);

    const location = await db.queryRow<Location>`
      INSERT INTO locations (user_id, household_id, name)
      VALUES (${userId}, ${householdId}, ${req.name})
      RETURNING id, user_id as "userId", name, created_at as "createdAt"
    `;

    if (!location) {
      throw new Error("Failed to create location");
    }

    return location;
  }
);
