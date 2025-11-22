import { describe, it, expect } from "vitest";
import { unique, groupBy, chunk } from "../src/lib/arrayUtils.js";

describe("arrayUtils", () => {
  it("unique should remove duplicates", () => {
    expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
    expect(unique(["a", "a", "b"])).toEqual(["a", "b"]);
  });

  it("groupBy should group items by key", () => {
    const users = [
      { id: 1, role: "admin" },
      { id: 2, role: "user" },
      { id: 3, role: "admin" },
    ];

    const grouped = groupBy(users, (u) => u.role);

    expect(grouped.admin).toHaveLength(2);
    expect(grouped.user).toHaveLength(1);
  });

  it("chunk should split array into chunks", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);

    expect(chunk([1, 2, 3], 0)).toEqual([]);
  });
});
