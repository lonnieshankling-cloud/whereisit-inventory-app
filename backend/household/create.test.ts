import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "../auth/auth";
import { create } from "./create";
import type { Household } from "./get";

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

describe("Create Household endpoint", () => {
  const mockAuthData: AuthData = {
    userID: "user-abc",
    imageUrl: "https://example.com/avatar.jpg",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(mockAuthData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should create a new household when authenticated", async () => {
    const mockHouseholdPayload = {
      name: "My Home",
    };

    const mockCreatedHousehold: Household = {
      id: 1,
      name: "My Home",
      owner_id: "user-abc",
      created_at: new Date("2025-10-22T10:00:00Z"),
    };

    vi.mocked(db.queryRow)
      .mockResolvedValueOnce({ household_id: null })
      .mockResolvedValueOnce(mockCreatedHousehold);

    vi.mocked(db.exec).mockResolvedValueOnce(undefined);

    const result = await create(mockHouseholdPayload);

    expect(getAuthData).toHaveBeenCalled();

    expect(db.queryRow).toHaveBeenCalledTimes(2);

    const userCheckCall = vi.mocked(db.queryRow).mock.calls[0];
    expect(userCheckCall[0]).toEqual([
      "\n        SELECT household_id FROM users WHERE id = ",
      "\n      ",
    ]);
    expect(userCheckCall[1]).toBe("user-abc");

    const householdInsertCall = vi.mocked(db.queryRow).mock.calls[1];
    expect(householdInsertCall[0]).toEqual([
      "\n        INSERT INTO households (name, owner_id)\n        VALUES (",
      ", ",
      ")\n        RETURNING id, name, owner_id, created_at\n      ",
    ]);
    expect(householdInsertCall[1]).toBe("My Home");
    expect(householdInsertCall[2]).toBe("user-abc");

    expect(db.exec).toHaveBeenCalledTimes(1);
    const userUpdateCall = vi.mocked(db.exec).mock.calls[0];
    expect(userUpdateCall[0]).toEqual([
      "\n        INSERT INTO users (id, household_id)\n        VALUES (",
      ", ",
      ")\n        ON CONFLICT (id) DO UPDATE SET household_id = ",
      "\n      ",
    ]);
    expect(userUpdateCall[1]).toBe("user-abc");
    expect(userUpdateCall[2]).toBe(1);
    expect(userUpdateCall[3]).toBe(1);

    expect(result).toEqual(mockCreatedHousehold);
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(1);
    expect(result.name).toBe("My Home");
    expect(result.created_at).toEqual(new Date("2025-10-22T10:00:00Z"));
  });

  test("should throw error when user already has a household", async () => {
    vi.mocked(db.queryRow).mockResolvedValueOnce({ household_id: 5 });

    await expect(
      create({
        name: "Another Home",
      })
    ).rejects.toThrow("User already has a household");

    expect(db.queryRow).toHaveBeenCalledTimes(1);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should throw error when household creation fails", async () => {
    vi.mocked(db.queryRow)
      .mockResolvedValueOnce({ household_id: null })
      .mockResolvedValueOnce(null);

    await expect(
      create({
        name: "Failed Home",
      })
    ).rejects.toThrow("Failed to create household");

    expect(db.queryRow).toHaveBeenCalledTimes(2);
    expect(db.exec).not.toHaveBeenCalled();
  });

  test("should reject unauthenticated requests", async () => {
    vi.mocked(getAuthData).mockReturnValue(null as any);

    await expect(
      create({
        name: "Unauth Home",
      })
    ).rejects.toThrow();
  });
});
