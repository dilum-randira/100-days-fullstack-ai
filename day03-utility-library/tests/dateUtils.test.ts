import { describe, it, expect } from "vitest";
import { formatDate, daysBetween, isWeekend, addDays } from "../src/lib/dateUtils.js";

describe("dateUtils", () => {
  it("formatDate should format with default separator", () => {
    const date = new Date(2025, 0, 2); // Jan 2, 2025
    expect(formatDate(date)).toBe("2025-01-02");
  });

  it("formatDate should support custom separator", () => {
    const date = new Date(2025, 0, 2);
    expect(formatDate(date, "/")).toBe("2025/01/02");
  });

  it("daysBetween should compute difference in days", () => {
    const d1 = new Date(2025, 0, 1);
    const d2 = new Date(2025, 0, 4);
    expect(daysBetween(d1, d2)).toBe(3);
    expect(daysBetween(d2, d1)).toBe(3);
  });

  it("isWeekend should detect weekends", () => {
    const saturday = new Date("2025-01-04");
    const monday = new Date("2025-01-06");
    expect(isWeekend(saturday)).toBe(true);
    expect(isWeekend(monday)).toBe(false);
  });

  it("addDays should add or subtract days", () => {
    const base = new Date(2025, 0, 1);
    expect(formatDate(addDays(base, 5))).toBe("2025-01-06");
    expect(formatDate(addDays(base, -1))).toBe("2024-12-31");
  });
});
