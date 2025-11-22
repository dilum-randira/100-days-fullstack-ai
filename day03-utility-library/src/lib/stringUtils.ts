/**
 * String utility helpers.
 */

/**
 * Capitalize the first character and lowercase the rest.
 *
 * @param str - Input string.
 * @returns New string with first letter uppercase and the rest lowercase.
 * @example
 * capitalize("hello WORLD"); // "Hello world"
 */
export function capitalize(str: string): string {
  if (!str) return "";
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Capitalize every word in a string.
 *
 * @param str - Input string.
 * @returns A new string with each word capitalized.
 * @example
 * capitalizeWords("hello world"); // "Hello World"
 */
export function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Truncate a string to a maximum length.
 * If the string is longer than `maxLength`, it will add "..." at the end.
 *
 * @param str - Input string.
 * @param maxLength - Maximum allowed length.
 * @returns The original string or a truncated version.
 * @example
 * truncate("Hello TypeScript", 8); // "Hello..."
 */
export function truncate(str: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (str.length <= maxLength) return str;
  if (maxLength <= 3) return "...".slice(0, maxLength);
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Very simple email validation using a lightweight regular expression.
 * This is not perfect, but good enough for basic checks.
 *
 * @param str - Email candidate.
 * @returns `true` if the string looks like an email address, otherwise `false`.
 * @example
 * isEmail("user@example.com"); // true
 */
export function isEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}
