import { describe, test, expect, vi, beforeEach } from "vitest";
import { lowStock } from "./low_stock";
import db from "../db";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(() => ({ userID: "user-abc" })),
}));

vi.mock("../db", () => ({
  default: {
    queryRow: vi.fn(),
    query: vi.fn(),
  },
}));

describe("lowStock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return empty array when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: null });

    const result = await lowStock({});

    expect(result).toEqual({ items: [] });
  });

  test("should calculate and return low stock items based on consumption", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: 1 });

    const mockItems = [
      {
        id: 1,
        name: "Milk",
        description: "Fresh milk",
        photoUrl: undefined,
        thumbnailUrl: undefined,
        quantity: 2,
        locationId: 1,
        locationName: "Fridge",
        tags: ["dairy"],
        expirationDate: new Date("2025-10-25"),
      },
    ];

    const mockConsumption = [
      { consumedQuantity: 1, recordedAt: new Date("2025-10-15") },
      { consumedQuantity: 1, recordedAt: new Date("2025-10-22") },
    ];

    async function* mockItemsGenerator() {
      for (const item of mockItems) {
        yield item;
      }
    }

    async function* mockConsumptionGenerator() {
      for (const record of mockConsumption) {
        yield record;
      }
    }

    vi.mocked(db.query)
      .mockReturnValueOnce(mockItemsGenerator() as any)
      .mockReturnValueOnce(mockConsumptionGenerator() as any);

    const result = await lowStock({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Milk");
    expect(result.items[0].daysUntilEmpty).toBeGreaterThanOrEqual(0);
  });
});
