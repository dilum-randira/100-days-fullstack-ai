/**
 * Utility helpers for working with arrays of numbers and basic frequency maps.
 */

/**
 * Find the maximum value in an array of numbers.
 *
 * @param numbers - Array of numbers.
 * @returns The maximum value, or `undefined` if the array is empty.
 */
export function findMax(numbers: number[]): number | undefined {
  if (numbers.length === 0) return undefined;
  let max = numbers[0];
  for (const n of numbers) {
    if (n > max) {
      max = n;
    }
  }
  return max;
}

/**
 * Find the minimum value in an array of numbers.
 *
 * @param numbers - Array of numbers.
 * @returns The minimum value, or `undefined` if the array is empty.
 */
export function findMin(numbers: number[]): number | undefined {
  if (numbers.length === 0) return undefined;
  let min = numbers[0];
  for (const n of numbers) {
    if (n < min) {
      min = n;
    }
  }
  return min;
}

/**
 * Build a frequency map from an array of items.
 *
 * @typeParam T - The type of the items (string or number).
 * @param items - Array of items.
 * @returns An object where each key is an item and the value is the count.
 */
export function buildFrequencyMap<T extends string | number>(
  items: T[],
): Record<T, number> {
  const freq: Record<T, number> = {} as Record<T, number>;

  for (const item of items) {
    freq[item] = (freq[item] ?? 0) + 1;
  }

  return freq;
}
