import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getConsumptionHistory } from "./get_consumption_history";
import type { ConsumptionEntry } from "./get_consumption_history";
import type { AuthData } from "../auth/auth";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    queryRow: vi.fn(),
    query: vi.fn(),
  },
}));

import { getAuthData } from "~encore/auth";
import db from "../db";

describe("Get Consumption History endpoint", () => {
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

  test("should get the consumption history for an item when authenticated", async () => {
    const mockItem = {
      id: 123,
      quantity: 10,
      createdAt: new Date("2025-10-01"),
    };

    const mockHistoryList: ConsumptionEntry[] = [
      {
        id: 1,
        itemId: 123,
        quantityRemaining: 8,
        consumedQuantity: 2,
        recordedAt: new Date("2025-10-10"),
      },
      {
        id: 2,
        itemId: 123,
        quantityRemaining: 5,
        consumedQuantity: 3,
        recordedAt: new Date("2025-10-15"),
      },
    ];

    async function* mockAsyncGenerator() {
      for (const entry of mockHistoryList) {
        yield entry;
      }
    }

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    vi.mocked(db.query).mockReturnValue(mockAsyncGenerator() as any);

    const result = await getConsumptionHistory({ itemId: 123 });

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
    expect(secondCall[0][0]).toContain("WHERE id =");
    expect(secondCall[1]).toBe(123);
    expect(secondCall[2]).toBe(1);

    expect(db.query).toHaveBeenCalledTimes(1);
    const queryCall = vi.mocked(db.query).mock.calls[0];
    const fullQuery = queryCall[0].join('');
    expect(fullQuery).toContain("FROM consumption_history");
    expect(fullQuery).toContain("WHERE item_id =");
    expect(fullQuery).toContain("ORDER BY recorded_at ASC");
    expect(queryCall[1]).toBe(123);

    expect(result.history).toEqual(mockHistoryList);
    expect(result.history.length).toBe(2);
    expect(result.history[0].consumedQuantity).toBe(2);
    expect(result.history[1].consumedQuantity).toBe(3);
    expect(result.initialQuantity).toBe(15);
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(getConsumptionHistory({ itemId: 123 })).rejects.toThrow();
  });

  test("should throw error when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    await expect(getConsumptionHistory({ itemId: 123 })).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
  });

  test("should throw error when item not found", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    await expect(getConsumptionHistory({ itemId: 123 })).rejects.toThrow("item not found");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
  });

  test("should return empty history and correct initial quantity when no consumption records exist", async () => {
    const mockItem = {
      id: 456,
      quantity: 20,
      createdAt: new Date("2025-10-01"),
    };

    async function* mockEmptyGenerator() {
      return;
    }

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockItem);

    vi.mocked(db.query).mockReturnValue(mockEmptyGenerator() as any);

    const result = await getConsumptionHistory({ itemId: 456 });

    expect(result.history).toEqual([]);
    expect(result.initialQuantity).toBe(20);
  });
});
