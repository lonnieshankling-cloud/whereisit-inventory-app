import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { bulkAddTags } from "./bulk_add_tags";
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

describe("Bulk Add Tags endpoint", () => {
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

  test("should add tags to multiple items when authenticated", async () => {
    const mockPayload = {
      itemIds: [123, 456],
      tags: ["new-tag", "test"],
    };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryRow).mockResolvedValueOnce({ count: 2 });

    const result = await bulkAddTags(mockPayload);

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(2);

    const userQueryCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userQueryCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userQueryCall[1]).toBe("user-abc");

    const updateCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(updateCall[1]).toEqual(["new-tag", "test"]);
    expect(updateCall[2]).toEqual([123, 456]);
    expect(updateCall[3]).toBe(1);

    expect(result).toEqual({ count: 2 });
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      bulkAddTags({ itemIds: [123, 456], tags: ["tag1"] })
    ).rejects.toThrow();

    expect(db.queryRow).not.toHaveBeenCalled();
  });

  test("should return zero count when itemIds array is empty", async () => {
    const result = await bulkAddTags({ itemIds: [], tags: ["tag1"] });

    expect(result).toEqual({ count: 0 });
    expect(db.queryRow).not.toHaveBeenCalled();
  });

  test("should return zero count when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    const result = await bulkAddTags({
      itemIds: [123, 456],
      tags: ["tag1"],
    });

    expect(result).toEqual({ count: 0 });
    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should return zero count when user does not exist", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    const result = await bulkAddTags({
      itemIds: [123, 456],
      tags: ["tag1"],
    });

    expect(result).toEqual({ count: 0 });
    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should only update items from user's household", async () => {
    const householdId = 5;

    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: householdId });
    vi.mocked(db.queryRow).mockResolvedValueOnce({ count: 3 });

    await bulkAddTags({
      itemIds: [100, 200, 300],
      tags: ["common-tag"],
    });

    const updateCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(updateCall[1]).toEqual(["common-tag"]);
    expect(updateCall[2]).toEqual([100, 200, 300]);
    expect(updateCall[3]).toBe(householdId);
  });

  test("should handle single item update", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryRow).mockResolvedValueOnce({ count: 1 });

    const result = await bulkAddTags({
      itemIds: [999],
      tags: ["solo-tag"],
    });

    expect(db.queryRow).toHaveBeenCalledTimes(2);

    const updateCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(updateCall[1]).toEqual(["solo-tag"]);
    expect(updateCall[2]).toEqual([999]);
    expect(updateCall[3]).toBe(1);

    expect(result).toEqual({ count: 1 });
  });

  test("should handle zero rows updated when items don't belong to household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryRow).mockResolvedValueOnce({ count: 0 });

    const result = await bulkAddTags({
      itemIds: [123, 456],
      tags: ["tag1"],
    });

    expect(result).toEqual({ count: 0 });
  });

  test("should handle adding multiple tags", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryRow).mockResolvedValueOnce({ count: 2 });

    const result = await bulkAddTags({
      itemIds: [123, 456],
      tags: ["tag1", "tag2", "tag3"],
    });

    const updateCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(updateCall[1]).toEqual(["tag1", "tag2", "tag3"]);

    expect(result).toEqual({ count: 2 });
  });

  test("should handle adding single tag", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryRow).mockResolvedValueOnce({ count: 1 });

    const result = await bulkAddTags({
      itemIds: [123],
      tags: ["single-tag"],
    });

    const updateCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(updateCall[1]).toEqual(["single-tag"]);

    expect(result).toEqual({ count: 1 });
  });
});
