import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { create, type Location } from "./create";
import type { AuthData } from "../auth/auth";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
}));

vi.mock("../household/utils", () => ({
  ensureUserHasHousehold: vi.fn(),
}));

import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

describe("Create Location endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "user-abc",
    imageUrl: "https://example.com/avatar.jpg",
    email: "test@example.com",
  };

  const mockUser = {
    household_id: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(mockAuthData);
    vi.mocked(ensureUserHasHousehold).mockResolvedValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should create a new location when authenticated", async () => {
    const mockLocationPayload = {
      name: "Kitchen",
    };

    const mockCreatedLocation: Location = {
      id: 123,
      userId: "user-abc",
      name: "Kitchen",
      createdAt: new Date("2025-10-22T10:00:00Z"),
    };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockCreatedLocation);

    const result = await create(mockLocationPayload);

    expect(getAuthData).toHaveBeenCalled();
    expect(ensureUserHasHousehold).toHaveBeenCalledWith("user-abc");
    
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    
    const insertCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(insertCall[0]).toEqual([
      "\n      INSERT INTO locations (user_id, household_id, name)\n      VALUES (",
      ", ",
      ", ",
      ")\n      RETURNING id, user_id as \"userId\", name, created_at as \"createdAt\"\n    ",
    ]);
    expect(insertCall[1]).toBe("user-abc");
    expect(insertCall[2]).toBe(1);
    expect(insertCall[3]).toBe("Kitchen");

    expect(result).toEqual(mockCreatedLocation);
    expect(result.id).toBe(123);
    expect(result.userId).toBe("user-abc");
    expect(result.name).toBe("Kitchen");
    expect(result.createdAt).toEqual(new Date("2025-10-22T10:00:00Z"));
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      create({
        name: "Kitchen",
      })
    ).rejects.toThrow();
  });

  test("should automatically create household for user without one", async () => {
    vi.mocked(ensureUserHasHousehold).mockResolvedValue(2);

    const mockLocation: Location = {
      id: 456,
      userId: "user-abc",
      name: "Kitchen",
      createdAt: new Date(),
    };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockLocation);

    const result = await create({
      name: "Kitchen",
    });

    expect(ensureUserHasHousehold).toHaveBeenCalledWith("user-abc");
    expect(result.id).toBe(456);
  });

  test("should throw error when database insert fails", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    await expect(
      create({
        name: "Kitchen",
      })
    ).rejects.toThrow("Failed to create location");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });
});
