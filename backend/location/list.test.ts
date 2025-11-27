import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "../auth/auth";
import type { Location } from "./create";
import { list } from "./list";

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

describe("List Locations endpoint", () => {
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

  test("should fetch all locations for the user when authenticated", async () => {
    const mockLocationsList: Location[] = [
      {
        id: 123,
        userId: "user-abc",
        name: "Kitchen",
        createdAt: new Date("2025-10-22T10:00:00Z"),
      },
      {
        id: 456,
        userId: "user-abc",
        name: "Garage",
        createdAt: new Date("2025-10-22T11:00:00Z"),
      },
    ];

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryAll).mockResolvedValue(mockLocationsList);

    const result = await list();

    expect(getAuthData).toHaveBeenCalled();

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    const firstCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(firstCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(firstCall[1]).toBe("user-abc");

    expect(db.queryAll).toHaveBeenCalledTimes(3);
    const secondCall = vi.mocked(db.queryAll).mock.calls[0];
    expect(secondCall[0]).toEqual([
      "\n        SELECT id, name, user_id, created_at\n        FROM locations\n        WHERE household_id = ",
      "\n        ORDER BY name ASC\n      ",
    ]);
    expect(secondCall[1]).toBe(1);

    expect(result).toEqual({ locations: mockLocationsList });
    expect(result.locations).toHaveLength(2);
    expect(result.locations[0].name).toBe("Kitchen");
    expect(result.locations[1].name).toBe("Garage");
  });

  test("should return empty array when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: undefined });

    const result = await list();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.queryAll).not.toHaveBeenCalled();
    expect(result).toEqual({ locations: [], containers: [] });
  });

  test("should return empty array when user not found", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    const result = await list();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.queryAll).not.toHaveBeenCalled();
    expect(result).toEqual({ locations: [], containers: [] });
  });

  test("should return empty locations array when household has no locations", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.queryAll).mockResolvedValue([]);

    const result = await list();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.queryAll).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ locations: [], containers: [] });
  });
});
