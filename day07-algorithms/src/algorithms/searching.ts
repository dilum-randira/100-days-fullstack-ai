/**
 * Searching algorithms implemented in TypeScript.
 */

/**
 * Linear search.
 *
 * Scans the array from left to right until it finds the target.
 * Returns the index of the target or -1 if not found.
 *
 * Time complexity: O(n)
 */
export function linearSearch<T>(items: T[], target: T): number {
  for (let i = 0; i < items.length; i++) {
    if (items[i] === target) {
      return i;
    }
  }
  return -1;
}

/**
 * Binary search.
 *
 * Works on a sorted (ascending) array of numbers. Repeatedly divides the search
 * interval in half, discarding the half that cannot contain the target.
 * Returns the index of the target or -1 if not found.
 *
 * Time complexity: O(log n)
 */
export function binarySearch(sortedNumbers: number[], target: number): number {
  let low = 0;
  let high = sortedNumbers.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = sortedNumbers[mid];

    if (value === target) {
      return mid;
    }

    if (value < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}
