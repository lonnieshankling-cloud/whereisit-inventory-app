import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { bulkDelete } from "./bulk_delete";
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

describe("Bulk Delete Items endpoint", () => {
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

  test("should delete multiple items when authenticated", async () => {
    const mockPayload = { itemIds: [123, 456] };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    await bulkDelete(mockPayload);

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);

    const userQueryCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userQueryCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userQueryCall[1]).toBe("user-abc");

    expect(db.exec).toHaveBeenCalledTimes(1);

    const deleteCall = vi.mocked(db.exec).mock.calls[0];
    expect(deleteCall[0]).toEqual([
      "\n      DELETE FROM items\n      WHERE id = ANY(",
      ") AND household_id = ",
      "\n    ",
    ]);
    expect(deleteCall[1]).toEqual([123, 456]);
    expect(deleteCall[2]).toBe(1);
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(bulkDelete({ itemIds: [123, 456] })).rejects.toThrow();

    expect(db.queryRow).not.toHaveBeenCalled();
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should return early when itemIds array is empty", async () => {
    await bulkDelete({ itemIds: [] });

    expect(db.queryRow).not.toHaveBeenCalled();
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should return early when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    await bulkDelete({ itemIds: [123, 456] });

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should return early when user does not exist", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    await bulkDelete({ itemIds: [123, 456] });

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should only delete items from user's household", async () => {
    const householdId = 5;

    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: householdId });
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    await bulkDelete({ itemIds: [100, 200, 300] });

    const deleteCall = vi.mocked(db.exec).mock.calls[0];
    expect(deleteCall[1]).toEqual([100, 200, 300]);
    expect(deleteCall[2]).toBe(householdId);
  });

  test("should handle single item deletion", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    await bulkDelete({ itemIds: [999] });

    expect(db.exec).toHaveBeenCalledTimes(1);

    const deleteCall = vi.mocked(db.exec).mock.calls[0];
    expect(deleteCall[1]).toEqual([999]);
    expect(deleteCall[2]).toBe(1);
  });
});
