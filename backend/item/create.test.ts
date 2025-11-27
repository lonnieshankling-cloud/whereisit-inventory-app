import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "../auth/auth";
import { create, type Item } from "./create";

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

describe("Create Item endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "test-user-123",
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

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      create({
        name: "Test Item",
        quantity: 1,
      })
    ).rejects.toThrow();
  });

  test("should create a new item when authenticated", async () => {
    const mockPayload = {
      name: "Test Item",
      quantity: 1,
      locationId: 10,
    };

    const mockCreatedItem: Item = {
      id: 1,
      userId: "test-user-123",
      locationId: 10,
      name: "Test Item",
      description: undefined,
      photoUrl: undefined,
      thumbnailUrl: undefined,
      quantity: 1,
      consumption: 0,
      expirationDate: undefined,
      tags: [],
      isFavorite: false,
      createdAt: new Date("2025-10-22T10:00:00Z"),
    };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockCreatedItem);

    const result = await create(mockPayload);

    expect(getAuthData).toHaveBeenCalled();
    expect(ensureUserHasHousehold).toHaveBeenCalledWith("test-user-123");
    
    expect(db.queryRow).toHaveBeenCalledTimes(1);
    
    const insertCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(insertCall[1]).toBe("test-user-123");
    expect(insertCall[2]).toBe(1);
    expect(insertCall[3]).toBe(10);
    expect(insertCall[4]).toBe(null);
    expect(insertCall[5]).toBe("Test Item");
    expect(insertCall[6]).toBe(null);
    expect(insertCall[7]).toBe(null);
    expect(insertCall[8]).toBe(null);
    expect(insertCall[9]).toBe(null);
    expect(insertCall[10]).toBe(null);
    expect(insertCall[11]).toBe(null);
    expect(insertCall[12]).toBe(1);
    expect(insertCall[13]).toBe(null);
    expect(insertCall[14]).toBe(null);
    expect(insertCall[15]).toBe(null);
    expect(insertCall[16]).toEqual([]);

    expect(result).toEqual(mockCreatedItem);
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(1);
    expect(result.name).toBe("Test Item");
    expect(result.userId).toBe("test-user-123");
    expect(result.quantity).toBe(1);
    expect(result.locationId).toBe(10);
    expect(result.isFavorite).toBe(false);
    expect(result.consumption).toBe(0);
    expect(result).toMatchObject({
      id: expect.any(Number),
      userId: expect.any(String),
      name: expect.any(String),
      quantity: expect.any(Number),
      consumption: expect.any(Number),
      tags: expect.any(Array),
      isFavorite: expect.any(Boolean),
      createdAt: expect.any(Date),
    });
  });

  test("should automatically create household for user without one", async () => {
    vi.mocked(ensureUserHasHousehold).mockResolvedValue(2);

    const mockItem: Item = {
      id: 99,
      userId: "test-user-123",
      locationId: undefined,
      name: "Test Item",
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

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockItem);

    const result = await create({
      name: "Test Item",
      quantity: 1,
    });

    expect(ensureUserHasHousehold).toHaveBeenCalledWith("test-user-123");
    expect(result.id).toBe(99);
  });

  test("should use default quantity of 1 when not provided", async () => {
    const mockItem: Item = {
      id: 2,
      userId: "test-user-123",
      locationId: undefined,
      name: "Default Quantity Item",
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

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockItem);

    const result = await create({
      name: "Default Quantity Item",
    });

    expect(result.quantity).toBe(1);
    expect(getAuthData).toHaveBeenCalled();
  });

  test("should handle optional fields correctly", async () => {
    const mockItem: Item = {
      id: 3,
      userId: "test-user-123",
      locationId: undefined,
      name: "Minimal Item",
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

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockItem);

    const result = await create({
      name: "Minimal Item",
    });

    expect(result.description).toBeUndefined();
    expect(result.photoUrl).toBeUndefined();
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.expirationDate).toBeUndefined();
    expect(result.tags).toEqual([]);
  });

  test("should create item with all optional fields provided", async () => {
    const expirationDate = new Date("2025-12-31");
    const mockPayload = {
      name: "Full Item",
      locationId: 5,
      description: "A complete test item",
      photoUrl: "https://example.com/photo.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg",
      quantity: 10,
      expirationDate: "2025-12-31",
      tags: ["electronics", "urgent"],
    };

    const mockItem: Item = {
      id: 4,
      userId: "test-user-123",
      locationId: 5,
      name: "Full Item",
      description: "A complete test item",
      photoUrl: "https://example.com/photo.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg",
      quantity: 10,
      consumption: 0,
      expirationDate: expirationDate,
      tags: ["electronics", "urgent"],
      isFavorite: false,
      createdAt: new Date(),
    };

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockItem);

    const result = await create(mockPayload);

    expect(result).toEqual(mockItem);
    expect(result.description).toBe("A complete test item");
    expect(result.photoUrl).toBe("https://example.com/photo.jpg");
    expect(result.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result.quantity).toBe(10);
    expect(result.tags).toEqual(["electronics", "urgent"]);
    expect(result.expirationDate).toEqual(expirationDate);
  });

  test("should verify database insert includes correct user and household data", async () => {
    const mockItem: Item = {
      id: 5,
      userId: "test-user-123",
      locationId: undefined,
      name: "User Context Item",
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

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockItem);

    await create({ name: "User Context Item" });

    const insertCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(insertCall[1]).toBe("test-user-123");
    expect(insertCall[2]).toBe(1);
  });
});
