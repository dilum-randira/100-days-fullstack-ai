/**
 * String utility helpers for Day 3.
 * Each function is small, focused, and uses clear TypeScript types.
 */

/**
 * Capitalize the first letter of the string and lowercase the rest.
 *
 * @param str - Any input string.
 * @returns A new string with first letter uppercased and the rest lowercased.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Convert a string to Title Case (every word capitalized).
 *
 * @param str - The input string.
 * @returns A new string in Title Case.
 */
export function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Convert a string into a URL-friendly "slug".
 * Example: "Hello World!!" -> "hello-world".
 *
 * @param str - The input string.
 * @returns A lowercase, dash-separated slug with non-alphanumeric characters removed.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    // Replace non-letter/number characters with spaces
    .replace(/[^a-z0-9]+/g, " ")
    // Trim spaces at the start/end
    .trim()
    // Replace spaces with dashes
    .replace(/\s+/g, "-");
}

/**
 * Truncate a string to a maximum length.
 * If the string is longer than maxLength, it adds "..." at the end.
 *
 * @param str - The input string.
 * @param maxLength - Maximum allowed length of the result.
 * @returns The original string or a truncated version with "...".
 */
export function truncate(str: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }

  if (str.length <= maxLength) {
    return str;
  }

  // Reserve space for the ellipsis ("...")
  if (maxLength <= 3) {
    return "...".slice(0, maxLength);
  }

  return str.slice(0, maxLength - 3) + "...";
}
