import { describe, test, expect, vi, beforeEach } from "vitest";
import { list } from "./list";
import { update } from "./update";
import { deleteItem } from "./delete";
import db from "../db";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
}));

describe("shopping list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should fetch all shopping list items for the user when authenticated", async () => {
    const { getAuthData } = await import("~encore/auth");
    
    vi.mocked(getAuthData).mockReturnValue({
      userID: "user-abc",
    } as any);

    const mockShoppingList = [
      {
        id: 1,
        userId: "user-abc",
        itemName: "Milk",
        quantity: 2,
        addedAt: new Date("2025-10-20"),
      },
      {
        id: 2,
        userId: "user-abc",
        itemName: "Eggs",
        quantity: 1,
        addedAt: new Date("2025-10-21"),
      },
    ];

    vi.mocked(db.queryAll).mockResolvedValue(mockShoppingList);

    const result = await list();

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryAll).toHaveBeenCalledWith(
      expect.anything(),
      "user-abc"
    );
    expect(result).toEqual({ items: mockShoppingList });
  });

  test("should update an existing shopping list item when authenticated", async () => {
    const { getAuthData } = await import("~encore/auth");

    vi.mocked(getAuthData).mockReturnValue({
      userID: "user-abc",
    } as any);

    const shoppingListItemId = 1;
    const mockUpdatePayload = { isPurchased: true };

    const updatedItem = {
      id: shoppingListItemId,
      userId: "user-abc",
      itemName: "Milk",
      quantity: 2,
      addedAt: new Date("2025-10-20"),
    };

    vi.mocked(db.queryRow).mockResolvedValue(updatedItem);

    const result = await update({ id: shoppingListItemId, ...mockUpdatePayload });

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalled();
    expect(result).toEqual(updatedItem);
  });

  test("should delete an existing shopping list item when authenticated", async () => {
    const { getAuthData } = await import("~encore/auth");

    vi.mocked(getAuthData).mockReturnValue({
      userID: "user-abc",
    } as any);

    const shoppingListItemId = 1;

    vi.mocked(db.exec).mockResolvedValue(undefined);

    await deleteItem({ id: shoppingListItemId });

    expect(getAuthData).toHaveBeenCalled();
    expect(db.exec).toHaveBeenCalled();
  });
});
