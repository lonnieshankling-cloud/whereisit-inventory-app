import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getInvitations } from "./get_invitations";
import type { AuthData } from "../auth/auth";
import type { HouseholdInvitation } from "./get_invitations";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    query: vi.fn(),
    queryRow: vi.fn(),
  },
}));

import { getAuthData } from "~encore/auth";
import db from "../db";

describe("Get Pending Invitations endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "user-xyz",
    imageUrl: "https://example.com/avatar.jpg",
    email: "owner@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(mockAuthData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should fetch all pending invitations sent by the household", async () => {
    const mockUserResult = { household_id: 789 };
    const mockInvitationList: HouseholdInvitation[] = [
      {
        id: 123,
        household_id: 789,
        invited_email: "invited@example.com",
        status: "pending",
        created_at: new Date("2025-10-22T10:00:00Z"),
      },
    ];

    const mockAsyncIterable = (async function* () {
      for (const invitation of mockInvitationList) {
        yield invitation;
      }
    })();

    vi.mocked(db.queryRow).mockReturnValue(Promise.resolve(mockUserResult) as any);
    vi.mocked(db.query).mockReturnValue(mockAsyncIterable as any);

    const result = await getInvitations();

    expect(getAuthData).toHaveBeenCalled();

    // First call should be queryRow to get household_id
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    const userCheckCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userCheckCall[0]).toEqual([
      "\n        SELECT household_id FROM users WHERE id = ",
      "\n      ",
    ]);
    expect(userCheckCall[1]).toBe("user-xyz");

    // Second call should be query for invitations
    expect(db.query).toHaveBeenCalledTimes(1);
    const queryCall = vi.mocked(db.query).mock.calls[0];
    expect(queryCall[0]).toEqual([
      "\n        SELECT id, household_id, invited_email, status, created_at\n        FROM household_invitations\n        WHERE household_id = ",
      " AND status = 'pending'\n        ORDER BY created_at DESC\n      ",
    ]);
    expect(queryCall[1]).toBe(789);

    expect(result).toEqual({ invitations: mockInvitationList });
    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].id).toBe(123);
    expect(result.invitations[0].household_id).toBe(789);
    expect(result.invitations[0].invited_email).toBe("invited@example.com");
    expect(result.invitations[0].status).toBe("pending");
  });

  test("should return empty array when user is not in a household", async () => {
    vi.mocked(db.queryRow).mockReturnValue(Promise.resolve(null) as any);

    const result = await getInvitations();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
    expect(result).toEqual({ invitations: [] });
  });

  test("should return empty array when no pending invitations exist", async () => {
    const mockUserResult = { household_id: 789 };
    const mockAsyncIterable = (async function* () {})();

    vi.mocked(db.queryRow).mockReturnValue(Promise.resolve(mockUserResult) as any);
    vi.mocked(db.query).mockReturnValue(mockAsyncIterable as any);

    const result = await getInvitations();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ invitations: [] });
  });
});
