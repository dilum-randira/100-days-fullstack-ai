/**
 * Math utility helpers.
 * All functions are pure and work only with numbers.
 */

/**
 * Calculate the sum of an array of numbers.
 *
 * @param numbers - Array of numbers to sum.
 * @returns The total sum. Returns 0 for an empty array.
 * @example
 * sum([1, 2, 3]); // 6
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}

/**
 * Calculate the average (mean) of an array of numbers.
 *
 * @param numbers - Array of numbers.
 * @returns The average value. Returns NaN for an empty array.
 * @example
 * average([2, 4, 6]); // 4
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) {
    return NaN;
  }
  return sum(numbers) / numbers.length;
}

/**
 * Clamp a value between a minimum and maximum.
 *
 * @param value - The value to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns `min` if value is less than `min`, `max` if greater than `max`, otherwise the value itself.
 * @example
 * clamp(10, 0, 5); // 5
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("min cannot be greater than max");
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a fixed number of decimal places.
 *
 * @param value - The number to round.
 * @param decimals - Number of decimal places (0 or greater).
 * @returns The rounded number.
 * @example
 * roundTo(3.14159, 2); // 3.14
 */
export function roundTo(value: number, decimals: number): number {
  if (decimals < 0) {
    throw new Error("decimals must be >= 0");
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
