import { describe, it, expect } from "vitest";
import { sum, average, clamp, roundTo } from "../src/lib/mathUtils.js";

describe("mathUtils", () => {
  it("sum should add numbers", () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it("average should compute mean", () => {
    expect(average([2, 4, 6])).toBe(4);
    expect(Number.isNaN(average([]))).toBe(true);
  });

  it("clamp should limit values to range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("roundTo should round to decimals", () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(1.005, 2)).toBeCloseTo(1.01, 5);
  });
});
