import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteItem } from "./delete";
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

describe("Delete Item endpoint", () => {
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

  test("should delete an existing item when authenticated", async () => {
    const itemId = 100;

    vi.mocked(db.queryRow).mockResolvedValueOnce(mockUser);
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    await deleteItem({ id: itemId });

    expect(getAuthData).toHaveBeenCalled();
    expect(db.queryRow).toHaveBeenCalledTimes(1);

    const userQueryCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userQueryCall[0]).toEqual([
      "\n      SELECT household_id FROM users WHERE id = ",
      "\n    ",
    ]);
    expect(userQueryCall[1]).toBe("test-user-123");

    expect(db.exec).toHaveBeenCalledTimes(1);

    const deleteCall = vi.mocked(db.exec).mock.calls[0];
    expect(deleteCall[0]).toEqual([
      "\n      DELETE FROM items\n      WHERE id = ",
      " AND household_id = ",
      "\n    ",
    ]);
    expect(deleteCall[1]).toBe(itemId);
    expect(deleteCall[2]).toBe(1);
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(deleteItem({ id: 100 })).rejects.toThrow();

    expect(db.queryRow).not.toHaveBeenCalled();
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should return early when user has no household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: undefined });

    await deleteItem({ id: 100 });

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should return early when user does not exist", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce(null);

    await deleteItem({ id: 100 });

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should only delete items from user's household", async () => {
    const itemId = 200;
    const householdId = 5;

    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: householdId });
    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    await deleteItem({ id: itemId });

    const deleteCall = vi.mocked(db.exec).mock.calls[0];
    expect(deleteCall[1]).toBe(itemId);
    expect(deleteCall[2]).toBe(householdId);
  });

  test("should handle multiple delete requests correctly", async () => {
    vi.mocked(db.queryRow).mockResolvedValue(mockUser);
    vi.mocked(db.exec).mockResolvedValue(undefined);

    await deleteItem({ id: 1 });
    await deleteItem({ id: 2 });
    await deleteItem({ id: 3 });

    expect(db.exec).toHaveBeenCalledTimes(3);

    const firstDeleteCall = vi.mocked(db.exec).mock.calls[0];
    expect(firstDeleteCall[1]).toBe(1);

    const secondDeleteCall = vi.mocked(db.exec).mock.calls[1];
    expect(secondDeleteCall[1]).toBe(2);

    const thirdDeleteCall = vi.mocked(db.exec).mock.calls[2];
    expect(thirdDeleteCall[1]).toBe(3);
  });
});
