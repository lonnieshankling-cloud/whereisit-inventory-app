import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { update } from "./update";
import type { Location } from "./create";
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

describe("Update Location endpoint", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should update an existing location when authenticated", async () => {
    const locationId = 123;
    const mockUpdatePayload = {
      id: locationId,
      name: "New Kitchen Name",
    };

    const mockUpdatedLocation: Location = {
      id: locationId,
      userId: "user-abc",
      name: "New Kitchen Name",
      createdAt: new Date("2025-10-22T10:00:00Z"),
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockUpdatedLocation);

    const result = await update(mockUpdatePayload);

    expect(getAuthData).toHaveBeenCalled();
    
    expect(db.queryRow).toHaveBeenCalledTimes(2);
    
    const firstCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(firstCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(firstCall[1]).toBe("user-abc");
    
    const secondCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(secondCall[0]).toEqual([
      "\n      UPDATE locations\n      SET name = ",
      "\n      WHERE id = ",
      " AND household_id = ",
      "\n      RETURNING id, user_id as \"userId\", name, created_at as \"createdAt\"\n    ",
    ]);
    expect(secondCall[1]).toBe("New Kitchen Name");
    expect(secondCall[2]).toBe(123);
    expect(secondCall[3]).toBe(1);

    expect(result).toEqual(mockUpdatedLocation);
    expect(result.id).toBe(123);
    expect(result.userId).toBe("user-abc");
    expect(result.name).toBe("New Kitchen Name");
    expect(result.createdAt).toEqual(new Date("2025-10-22T10:00:00Z"));
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      update({
        id: 123,
        name: "New Kitchen Name",
      })
    ).rejects.toThrow();
  });

  test("should throw error when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: undefined });

    await expect(
      update({
        id: 123,
        name: "New Kitchen Name",
      })
    ).rejects.toThrow("location not found");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should throw error when location does not exist", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(
      update({
        id: 123,
        name: "New Kitchen Name",
      })
    ).rejects.toThrow("location not found");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
  });

  test("should throw error when updating location from different household", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(
      update({
        id: 999,
        name: "New Kitchen Name",
      })
    ).rejects.toThrow("location not found");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
  });
});
