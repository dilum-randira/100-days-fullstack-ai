/**
 * Date utility helpers.
 */

/**
 * Format a date as YYYY{separator}MM{separator}DD.
 *
 * @param date - Date instance to format.
 * @param separator - Optional separator string (default: "-").
 * @returns Formatted date string.
 * @example
 * formatDate(new Date(2025, 0, 2)); // "2025-01-02"
 */
export function formatDate(date: Date, separator: string = "-"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${separator}${month}${separator}${day}`;
}

/**
 * Get the number of full days between two dates.
 *
 * @param date1 - First date.
 * @param date2 - Second date.
 * @returns Number of days between the dates (absolute value).
 * @example
 * daysBetween(new Date(2025, 0, 1), new Date(2025, 0, 3)); // 2
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diff / msPerDay);
}

/**
 * Check if a given date falls on a weekend (Saturday or Sunday).
 *
 * @param date - Date to check.
 * @returns `true` if Saturday or Sunday, otherwise `false`.
 * @example
 * isWeekend(new Date("2025-01-04")); // true (Saturday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Create a new Date that is a given number of days after (or before) the input date.
 *
 * @param date - Starting date.
 * @param days - Number of days to add (can be negative to go backwards).
 * @returns A new Date instance with the days added.
 * @example
 * addDays(new Date(2025, 0, 1), 5); // 2025-01-06
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}
