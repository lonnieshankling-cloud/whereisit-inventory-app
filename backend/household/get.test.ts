import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { get } from "./get";
import type { AuthData } from "../auth/auth";
import type { Household } from "./get";

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

describe("Get Household endpoint", () => {
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

  test("should fetch the household for the current user when authenticated", async () => {
    const mockHousehold: Household = {
      id: 1,
      name: "My Home",
      owner_id: "user-abc",
      created_at: new Date("2025-10-22T10:00:00Z"),
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce({ household_id: 1 })
      .mockResolvedValueOnce(mockHousehold);

    const result = await get();

    expect(getAuthData).toHaveBeenCalled();

    expect(db.queryRow).toHaveBeenCalledTimes(2);

    const userLookupCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userLookupCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userLookupCall[1]).toBe("user-abc");

    const householdLookupCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(householdLookupCall[0]).toEqual([
      "\n      SELECT id, name, owner_id, created_at FROM households WHERE id = ",
      "\n    ",
    ]);
    expect(householdLookupCall[1]).toBe(1);

    expect(result.household).toEqual(mockHousehold);
    expect(result.current_user_id).toBe("user-abc");
    expect(result.household).toHaveProperty("id");
    expect(result.household!.id).toBe(1);
    expect(result.household!.name).toBe("My Home");
  });

  test("should return null when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: undefined });

    const result = await get();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ household: null, current_user_id: "user-abc" });
  });

  test("should return null when user does not exist", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    const result = await get();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ household: null, current_user_id: "user-abc" });
  });
});
