import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteLocation } from "./delete";
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

import { getAuthData } from "~encore/auth";
import db from "../db";

describe("Delete Location endpoint", () => {
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

  test("should delete an existing location when authenticated", async () => {
    const locationId = 123;
    const mockDeletePayload = {
      id: locationId,
    };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    const result = await deleteLocation(mockDeletePayload);

    expect(getAuthData).toHaveBeenCalled();
    
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    
    const firstCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(firstCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(firstCall[1]).toBe("user-abc");
    
    expect(db.exec).toHaveBeenCalledTimes(1);
    const execCall = vi.mocked(db.exec).mock.calls[0];
    expect(execCall[0]).toEqual([
      "\n      DELETE FROM locations\n      WHERE id = ",
      " AND household_id = ",
      "\n    ",
    ]);
    expect(execCall[1]).toBe(123);
    expect(execCall[2]).toBe(1);

    expect(result).toBeUndefined();
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      deleteLocation({
        id: 123,
      })
    ).rejects.toThrow();
  });

  test("should not delete when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: undefined });

    const result = await deleteLocation({
      id: 123,
    });

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.exec).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  test("should only delete locations from user's household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    await deleteLocation({
      id: 999,
    });

    expect(db.exec).toHaveBeenCalledTimes(1);
    const execCall = vi.mocked(db.exec).mock.calls[0];
    expect(execCall[0]).toEqual([
      "\n      DELETE FROM locations\n      WHERE id = ",
      " AND household_id = ",
      "\n    ",
    ]);
    expect(execCall[1]).toBe(999);
    expect(execCall[2]).toBe(1);
  });
});
