import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "../auth/auth";
import type { Item } from "./create";
import { recent } from "./recent";

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

describe("Recent Items endpoint", () => {
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

  test("should fetch recently added items when authenticated", async () => {
    const mockRecentItemsList: Item[] = [
      {
        id: 789,
        userId: "user-abc",
        locationId: 10,
        name: "New Laptop",
        description: "Brand new laptop",
        photoUrl: "https://example.com/laptop.jpg",
        thumbnailUrl: "https://example.com/laptop-thumb.jpg",
        quantity: 1,
        consumption: 0,
        expirationDate: undefined,
        tags: ["electronics"],
        isFavorite: false,
        createdAt: new Date("2025-10-22T10:00:00Z"),
      },
      {
        id: 788,
        userId: "user-abc",
        locationId: 11,
        name: "Coffee Beans",
        description: "Organic coffee",
        photoUrl: undefined,
        thumbnailUrl: undefined,
        quantity: 2,
        consumption: 0,
        expirationDate: new Date("2025-11-15"),
        tags: ["food"],
        isFavorite: true,
        createdAt: new Date("2025-10-21T09:00:00Z"),
      },
    ];

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryAll).mockResolvedValueOnce(mockRecentItemsList);

    const result = await recent({});

    expect(getAuthData).toHaveBeenCalled();

    expect(db.queryRow).toHaveBeenCalledTimes(2);
    const userQueryCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userQueryCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userQueryCall[1]).toBe("user-abc");

    expect(db.queryAll).toHaveBeenCalledTimes(1);
    const itemsQueryCall = vi.mocked(db.queryAll).mock.calls[0];
    expect(itemsQueryCall[1]).toBe(1);

    expect(result.items).toEqual(mockRecentItemsList);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe("New Laptop");
    expect(result.items[1].name).toBe("Coffee Beans");
  });

  test("should return empty array when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    const result = await recent({});

    expect(result).toEqual({ items: [], total: 0, hasMore: false });
    expect(db.queryAll).not.toHaveBeenCalled();
  });

  test("should return empty array when user is not found", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    const result = await recent({});

    expect(result).toEqual({ items: [], total: 0, hasMore: false });
    expect(db.queryAll).not.toHaveBeenCalled();
  });
});
