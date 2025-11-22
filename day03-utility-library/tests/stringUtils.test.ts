import { describe, it, expect } from "vitest";
import { capitalize, capitalizeWords, truncate, isEmail } from "../src/lib/stringUtils.js";

describe("stringUtils", () => {
  it("capitalize should format single word", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("hELLO")).toBe("Hello");
  });

  it("capitalizeWords should format multiple words", () => {
    expect(capitalizeWords("hello world")).toBe("Hello World");
  });

  it("truncate should shorten long strings", () => {
    expect(truncate("Hello TypeScript", 20)).toBe("Hello TypeScript");
    expect(truncate("Hello TypeScript", 8)).toBe("Hello...");
  });

  it("isEmail should detect simple emails", () => {
    expect(isEmail("user@example.com")).toBe(true);
    expect(isEmail("not-an-email")).toBe(false);
  });
});
