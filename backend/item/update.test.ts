import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { update } from "./update";
import type { Item } from "./create";
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

describe("Update Item endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "test-user-123",
    imageUrl: "https://example.com/avatar.jpg",
    email: "test@example.com",
  };

  const mockUser = {
    household_id: 1,
  };

  const mockExistingItem: Item = {
    id: 100,
    userId: "test-user-123",
    locationId: 5,
    name: "Original Item",
    description: "Original description",
    photoUrl: "https://example.com/original.jpg",
    thumbnailUrl: "https://example.com/original-thumb.jpg",
    quantity: 5,
    consumption: 2,
    expirationDate: new Date("2025-11-01"),
    tags: ["original"],
    isFavorite: false,
    createdAt: new Date("2025-10-01T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(mockAuthData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should update an existing item when authenticated", async () => {
    const mockUpdatePayload = {
      id: 100,
      name: "Updated Item Name",
      quantity: 10,
    };

    const mockUpdatedItem: Item = {
      ...mockExistingItem,
      name: "Updated Item Name",
      quantity: 10,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockExistingItem)
      .mockResolvedValueOnce(mockUpdatedItem);

    const result = await update(mockUpdatePayload);

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(3);

    expect(result).toEqual(mockUpdatedItem);
    expect(result.name).toBe("Updated Item Name");
    expect(result.quantity).toBe(10);
    expect(result.id).toBe(100);
  });

  test("should throw error when user is not authenticated", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      update({
        id: 100,
        name: "Test",
      })
    ).rejects.toThrow();
  });

  test("should throw error when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    await expect(
      update({
        id: 100,
        name: "Test",
      })
    ).rejects.toThrow("item not found");
  });

  test("should throw error when item does not exist", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(
      update({
        id: 999,
        name: "Non-existent",
      })
    ).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
  });

  test("should throw error when item belongs to different household", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(
      update({
        id: 100,
        name: "Test",
      })
    ).rejects.toThrow("item not found");
  });

  test("should update only specified fields and preserve others", async () => {
    const mockUpdatePayload = {
      id: 100,
      name: "Partially Updated",
    };

    const mockUpdatedItem: Item = {
      ...mockExistingItem,
      name: "Partially Updated",
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockExistingItem)
      .mockResolvedValueOnce(mockUpdatedItem);

    const result = await update(mockUpdatePayload);

    expect(result.name).toBe("Partially Updated");
    expect(result.quantity).toBe(mockExistingItem.quantity);
    expect(result.description).toBe(mockExistingItem.description);
    expect(result.locationId).toBe(mockExistingItem.locationId);
  });

  test("should update all fields when all are provided", async () => {
    const expirationDate = new Date("2026-01-15");
    const mockUpdatePayload = {
      id: 100,
      name: "Fully Updated Item",
      locationId: 20,
      description: "New description",
      photoUrl: "https://example.com/new.jpg",
      thumbnailUrl: "https://example.com/new-thumb.jpg",
      quantity: 15,
      consumption: 5,
      expirationDate: expirationDate,
      tags: ["updated", "new"],
      isFavorite: true,
    };

    const mockUpdatedItem: Item = {
      id: 100,
      userId: "test-user-123",
      locationId: 20,
      name: "Fully Updated Item",
      description: "New description",
      photoUrl: "https://example.com/new.jpg",
      thumbnailUrl: "https://example.com/new-thumb.jpg",
      quantity: 15,
      consumption: 5,
      expirationDate: expirationDate,
      tags: ["updated", "new"],
      isFavorite: true,
      createdAt: mockExistingItem.createdAt,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockExistingItem)
      .mockResolvedValueOnce(mockUpdatedItem);

    const result = await update(mockUpdatePayload);

    expect(result).toEqual(mockUpdatedItem);
    expect(result.name).toBe("Fully Updated Item");
    expect(result.locationId).toBe(20);
    expect(result.description).toBe("New description");
    expect(result.photoUrl).toBe("https://example.com/new.jpg");
    expect(result.thumbnailUrl).toBe("https://example.com/new-thumb.jpg");
    expect(result.quantity).toBe(15);
    expect(result.consumption).toBe(5);
    expect(result.expirationDate).toEqual(expirationDate);
    expect(result.tags).toEqual(["updated", "new"]);
    expect(result.isFavorite).toBe(true);
  });

  test("should allow clearing optional fields by setting to null", async () => {
    const mockUpdatePayload = {
      id: 100,
      description: undefined,
      photoUrl: undefined,
      thumbnailUrl: undefined,
      expirationDate: undefined,
    };

    const mockUpdatedItem: Item = {
      ...mockExistingItem,
      description: undefined,
      photoUrl: undefined,
      thumbnailUrl: undefined,
      expirationDate: undefined,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockExistingItem)
      .mockResolvedValueOnce(mockUpdatedItem);

    const result = await update(mockUpdatePayload);

    expect(result.description).toBeUndefined();
    expect(result.photoUrl).toBeUndefined();
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.expirationDate).toBeUndefined();
  });

  test("should toggle favorite status", async () => {
    const mockUpdatePayload = {
      id: 100,
      isFavorite: true,
    };

    const mockUpdatedItem: Item = {
      ...mockExistingItem,
      isFavorite: true,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockExistingItem)
      .mockResolvedValueOnce(mockUpdatedItem);

    const result = await update(mockUpdatePayload);

    expect(result.isFavorite).toBe(true);
  });

  test("should update locationId to null", async () => {
    const mockUpdatePayload = {
      id: 100,
      locationId: undefined,
    };

    const mockUpdatedItem: Item = {
      ...mockExistingItem,
      locationId: undefined,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockExistingItem)
      .mockResolvedValueOnce(mockUpdatedItem);

    const result = await update(mockUpdatePayload);

    expect(result.locationId).toBeUndefined();
  });
});
