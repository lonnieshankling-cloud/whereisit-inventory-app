import { describe, it, expect, vi, beforeEach } from "vitest";
import { search } from "./search";

vi.mock("~encore/auth", () => ({
  getAuthData: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    query: vi.fn(),
  },
}));

import { getAuthData } from "~encore/auth";

describe("search items endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthData).mockReturnValue(null as any);
  });

  it("should reject unauthenticated requests", async () => {
    await expect(
      search({ query: "test" })
    ).rejects.toThrow();
  });
});
