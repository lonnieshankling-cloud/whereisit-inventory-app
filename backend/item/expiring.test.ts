import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "../auth/auth";
import type { Item } from "./create";
import { expiring } from "./expiring";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
  },
}));

import { getAuthData } from "~encore/auth";
import db from "../db";

describe("Expiring Items endpoint", () => {
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

  test("should fetch items that are expiring soon when authenticated", async () => {
    const mockExpiringItemsList: Item[] = [
      {
        id: 123,
        userId: "user-abc",
        locationId: 5,
        name: "Milk",
        description: "Fresh milk",
        photoUrl: undefined,
        thumbnailUrl: undefined,
        quantity: 2,
        consumption: 0,
        expirationDate: new Date("2025-10-25T00:00:00Z"),
        tags: ["dairy"],
        isFavorite: false,
        createdAt: new Date("2025-10-20T10:00:00Z"),
      },
      {
        id: 124,
        userId: "user-abc",
        locationId: 5,
        name: "Yogurt",
        description: undefined,
        photoUrl: undefined,
        thumbnailUrl: undefined,
        quantity: 1,
        consumption: 0,
        expirationDate: new Date("2025-10-28T00:00:00Z"),
        tags: [],
        isFavorite: true,
        createdAt: new Date("2025-10-21T10:00:00Z"),
      },
    ];

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryAll).mockResolvedValueOnce(mockExpiringItemsList);

    const result = await expiring({});

    expect(getAuthData).toHaveBeenCalled();
    
    expect(db.queryRow).toHaveBeenCalledTimes(2);
    const userQuery = vi.mocked(db.queryRow).mock.calls[0];
    expect(userQuery[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userQuery[1]).toBe("user-abc");

    expect(db.queryAll).toHaveBeenCalledTimes(1);
    const itemsQuery = vi.mocked(db.queryAll).mock.calls[0];
    expect(itemsQuery[1]).toBe(1);

    expect(result.items).toEqual(mockExpiringItemsList);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe("Milk");
    expect(result.items[1].name).toBe("Yogurt");
  });

  test("should return empty array when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    const result = await expiring({});

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.queryAll).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0, hasMore: false });
  });

  test("should return empty array when user not found", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    const result = await expiring({});

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.queryAll).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0, hasMore: false });
  });

  test("should return empty array when no items are expiring", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryAll).mockResolvedValueOnce([]);

    const result = await expiring({});

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(2);
    expect(db.queryAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: [], total: 0, hasMore: false });
  });
});
