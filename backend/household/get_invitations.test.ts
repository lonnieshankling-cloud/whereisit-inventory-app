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
  },
}));

import { getAuthData } from "~encore/auth";
import db from "../db";

describe("Get Pending Invitations endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "user-xyz",
    imageUrl: "https://example.com/avatar.jpg",
    email: "invited@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(mockAuthData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should fetch all pending invitations for the authenticated user", async () => {
    const mockInvitationList: HouseholdInvitation[] = [
      {
        id: 123,
        household_id: 456,
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

    vi.mocked(db.query).mockReturnValue(mockAsyncIterable as any);

    const result = await getInvitations();

    expect(getAuthData).toHaveBeenCalled();

    expect(db.query).toHaveBeenCalledTimes(1);
    const queryCall = vi.mocked(db.query).mock.calls[0];
    expect(queryCall[0]).toEqual([
      "\n      SELECT id, household_id, invited_email, status, created_at\n      FROM household_invitations\n      WHERE invited_email = ",
      " AND status = 'pending'\n      ORDER BY created_at DESC\n    ",
    ]);
    expect(queryCall[1]).toBe("invited@example.com");

    expect(result).toEqual({ invitations: mockInvitationList });
    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].id).toBe(123);
    expect(result.invitations[0].household_id).toBe(456);
    expect(result.invitations[0].invited_email).toBe("invited@example.com");
    expect(result.invitations[0].status).toBe("pending");
  });

  test("should return empty array when user has no email", async () => {
    vi.mocked(getAuthData).mockReturnValue({
      userID: "user-xyz",
      imageUrl: "https://example.com/avatar.jpg",
      email: null,
    });

    const result = await getInvitations();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
    expect(result).toEqual({ invitations: [] });
  });

  test("should return empty array when no pending invitations exist", async () => {
    const mockAsyncIterable = (async function* () {})();

    vi.mocked(db.query).mockReturnValue(mockAsyncIterable as any);

    const result = await getInvitations();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ invitations: [] });
  });
});
