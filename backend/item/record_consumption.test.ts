import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { recordConsumption } from "./record_consumption";
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

describe("Record Consumption endpoint", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should record a new consumption entry for an item", async () => {
    const mockConsumptionPayload = {
      itemId: 123,
      consumedQuantity: 1,
    };

    const mockItem = {
      id: 123,
      quantity: 5,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    vi.mocked(db.exec).mockResolvedValue(undefined);

    const result = await recordConsumption(mockConsumptionPayload);

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(2);

    expect(db.exec).toHaveBeenCalledTimes(2);

    const updateCall = vi.mocked(db.exec).mock.calls[0];
    expect(updateCall[0]).toEqual([
      "\n      UPDATE items\n      SET quantity = ",
      "\n      WHERE id = ",
      "\n    ",
    ]);
    expect(updateCall[1]).toBe(4);
    expect(updateCall[2]).toBe(123);

    const insertCall = vi.mocked(db.exec).mock.calls[1];
    expect(insertCall[0]).toEqual([
      "\n      INSERT INTO consumption_history (item_id, quantity_remaining, consumed_quantity)\n      VALUES (",
      ", ",
      ", ",
      ")\n    ",
    ]);
    expect(insertCall[1]).toBe(123);
    expect(insertCall[2]).toBe(4);
    expect(insertCall[3]).toBe(1);

    expect(result).toEqual({
      success: true,
      newQuantity: 4,
    });
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      recordConsumption({
        itemId: 123,
        consumedQuantity: 1,
      })
    ).rejects.toThrow();
  });

  test("should throw error when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    await expect(
      recordConsumption({
        itemId: 123,
        consumedQuantity: 1,
      })
    ).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should throw error when item not found", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(
      recordConsumption({
        itemId: 999,
        consumedQuantity: 1,
      })
    ).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should not reduce quantity below zero", async () => {
    const mockItem = {
      id: 123,
      quantity: 2,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    vi.mocked(db.exec).mockResolvedValue(undefined);

    const result = await recordConsumption({
      itemId: 123,
      consumedQuantity: 5,
    });

    expect(result.newQuantity).toBe(0);
    expect(result.success).toBe(true);

    const updateCall = vi.mocked(db.exec).mock.calls[0];
    expect(updateCall[1]).toBe(0);
  });

  test("should handle consumption that exactly depletes quantity", async () => {
    const mockItem = {
      id: 123,
      quantity: 3,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    vi.mocked(db.exec).mockResolvedValue(undefined);

    const result = await recordConsumption({
      itemId: 123,
      consumedQuantity: 3,
    });

    expect(result.newQuantity).toBe(0);
    expect(result.success).toBe(true);
  });

  test("should verify user can only consume items from their household", async () => {
    const mockItem = {
      id: 123,
      quantity: 5,
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    vi.mocked(db.exec).mockResolvedValue(undefined);

    await recordConsumption({
      itemId: 123,
      consumedQuantity: 1,
    });

    const itemQueryCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(itemQueryCall[0]).toEqual([
      "\n      SELECT id, quantity\n      FROM items\n      WHERE id = ",
      " AND household_id = ",
      "\n    ",
    ]);
    expect(itemQueryCall[1]).toBe(123);
    expect(itemQueryCall[2]).toBe(1);
  });
});
