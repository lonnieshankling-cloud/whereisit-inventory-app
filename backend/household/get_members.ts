import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface HouseholdMember {
  id: string;
  created_at: Date;
  is_owner: boolean;
}

export interface GetMembersResponse {
  members: HouseholdMember[];
}

export const getMembers = api(
  { method: "GET", path: "/household/members", expose: true, auth: true },
  async (): Promise<GetMembersResponse> => {
    const auth = getAuthData()!;

    const userResult = await db.queryRow`
      SELECT household_id FROM users WHERE id = ${auth.userID}
    `;

    if (!userResult || !userResult.household_id) {
      throw new Error("User is not in a household");
    }

    const householdResult = await db.queryRow`
      SELECT owner_id FROM households WHERE id = ${userResult.household_id}
    `;

    const ownerId = householdResult?.owner_id;

    const memberResults: HouseholdMember[] = [];
    for await (const member of db.query<{ id: string; created_at: Date }>`
      SELECT id, created_at
      FROM users
      WHERE household_id = ${userResult.household_id}
      ORDER BY created_at ASC
    `) {
      memberResults.push({
        ...member,
        is_owner: member.id === ownerId
      });
    }

    return { members: memberResults };
  }
);
