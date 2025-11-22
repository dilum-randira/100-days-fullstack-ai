/**
 * Array utility helpers with generics.
 */

/**
 * Return a new array with duplicate items removed.
 *
 * @typeParam T - The element type of the array.
 * @param items - Array of items of any type.
 * @returns A new array containing only unique values.
 * @example
 * unique([1, 2, 2, 3]); // [1, 2, 3]
 */
export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/**
 * Group items in an array based on a key selector function.
 *
 * @typeParam T - The element type of the array.
 * @typeParam K - The key type (string or number) used for grouping.
 * @param items - Array of items to group.
 * @param keySelector - Function that returns the key for each item.
 * @returns An object where each key maps to an array of items.
 * @example
 * groupBy(users, (u) => u.role);
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keySelector: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((groups, item) => {
    const key = keySelector(item);
    if (!groups[key]) {
      groups[key] = [] as T[];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * Split an array into smaller arrays ("chunks") of the given size.
 *
 * @typeParam T - The element type of the array.
 * @param items - The input array.
 * @param size - Size of each chunk (must be greater than 0).
 * @returns An array of chunks (each chunk is an array of `T`).
 * @example
 * chunk([1, 2, 3, 4], 2); // [[1, 2], [3, 4]]
 */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  if (size <= 0) return result;

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}
