import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { invite } from "./invite";
import type { AuthData } from "../auth/auth";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    queryRow: vi.fn(),
  },
}));

import { getAuthData } from "~encore/auth";
import db from "../db";

describe("Create Household Invitation endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "user-abc",
    imageUrl: "https://example.com/avatar.jpg",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(mockAuthData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should create a new household invitation when authenticated", async () => {
    const mockInvitationPayload = {
      invited_email: "new-member@example.com",
    };

    const mockUserWithHousehold = {
      household_id: 123,
    };

    const mockCreatedInvitation = {
      id: 456,
      invited_email: "new-member@example.com",
      status: "pending",
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUserWithHousehold)
      .mockResolvedValueOnce(mockCreatedInvitation);

    const result = await invite(mockInvitationPayload);

    expect(getAuthData).toHaveBeenCalled();

    expect(db.queryRow).toHaveBeenCalledTimes(2);

    const userCheckCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userCheckCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userCheckCall[1]).toBe("user-abc");

    const invitationInsertCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(invitationInsertCall[0]).toEqual([
      "\n      INSERT INTO household_invitations (household_id, invited_email, status)\n      VALUES (",
      ", ",
      ", 'pending')\n      RETURNING id, invited_email, status\n    ",
    ]);
    expect(invitationInsertCall[1]).toBe(123);
    expect(invitationInsertCall[2]).toBe("new-member@example.com");

    expect(result).toEqual(mockCreatedInvitation);
    expect(result.id).toBe(456);
    expect(result.invited_email).toBe("new-member@example.com");
    expect(result.status).toBe("pending");
  });

  test("should throw error when user is not part of a household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    await expect(
      invite({
        invited_email: "new-member@example.com",
      })
    ).rejects.toThrow("You must be part of a household to invite members");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should throw error when user does not exist", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    await expect(
      invite({
        invited_email: "new-member@example.com",
      })
    ).rejects.toThrow("You must be part of a household to invite members");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      invite({
        invited_email: "new-member@example.com",
      })
    ).rejects.toThrow();
  });
});
