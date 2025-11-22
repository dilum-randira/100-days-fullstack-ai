/**
 * Array utility helpers for Day 3.
 * These examples demonstrate how to use TypeScript generics in a beginner-friendly way.
 */

/**
 * Return a new array with duplicate items removed.
 *
 * Generic `<T>` means this function can work with any type (string, number, object, etc.).
 *
 * @param items - Array of items of any type.
 * @returns A new array containing only unique values.
 */
export function unique<T>(items: T[]): T[] {
  // `Set` automatically removes duplicates; we convert it back to an array.
  return Array.from(new Set(items));
}

/**
 * Split an array into smaller arrays ("chunks") of the given size.
 *
 * @param items - The input array.
 * @param size - Size of each chunk (must be greater than 0).
 * @returns An array of chunks (each chunk is an array of `T`).
 */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  if (size <= 0) {
    return result;
  }

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

/**
 * Get the first element of an array.
 *
 * @param items - The input array.
 * @returns The first element or `undefined` if the array is empty.
 */
export function first<T>(items: T[]): T | undefined {
  return items[0];
}

/**
 * Get the last element of an array.
 *
 * @param items - The input array.
 * @returns The last element or `undefined` if the array is empty.
 */
export function last<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}
