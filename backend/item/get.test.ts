import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "../auth/auth";
import type { Item } from "./create";
import { get } from "./get";

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

describe("Get Single Item endpoint", () => {
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

  test("should fetch a single item by its ID when authenticated", async () => {
    const mockItem: Item = {
      id: 123,
      userId: "user-abc",
      locationId: 10,
      name: "Test Item",
      description: "Test description",
      photoUrl: "https://example.com/photo.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg",
      quantity: 5,
      consumption: 2,
      expirationDate: new Date("2025-12-31"),
      tags: ["test", "sample"],
      isFavorite: true,
      createdAt: new Date("2025-10-22T10:00:00Z"),
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    const result = await get({ id: 123 });

    expect(getAuthData).toHaveBeenCalled();

    expect(db.queryRow).toHaveBeenCalledTimes(2);

    const firstCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(firstCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(firstCall[1]).toBe("user-abc");

    const secondCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(secondCall[0][0]).toContain("SELECT");
    expect(secondCall[0][0]).toContain("FROM items");
    expect(secondCall[0][0]).toContain("WHERE i.id =");
    expect(secondCall[1]).toBe(123);
    expect(secondCall[2]).toBe(1);

    expect(result).toEqual(mockItem);
    expect(result.id).toBe(123);
    expect(result.name).toBe("Test Item");
    expect(result.userId).toBe("user-abc");
    expect(result.quantity).toBe(5);
    expect(result.consumption).toBe(2);
    expect(result.isFavorite).toBe(true);
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(get({ id: 123 })).rejects.toThrow();
  });

  test("should throw error when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    await expect(get({ id: 123 })).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should throw error when item not found", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(get({ id: 999 })).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
  });

  test("should verify household isolation", async () => {
    const mockItem: Item = {
      id: 456,
      userId: "user-abc",
      locationId: undefined,
      name: "Household Item",
      description: undefined,
      photoUrl: undefined,
      thumbnailUrl: undefined,
      quantity: 1,
      consumption: 0,
      expirationDate: undefined,
      tags: [],
      isFavorite: false,
      createdAt: new Date(),
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    await get({ id: 456 });

    const itemQueryCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(itemQueryCall[2]).toBe(1);
  });
});
