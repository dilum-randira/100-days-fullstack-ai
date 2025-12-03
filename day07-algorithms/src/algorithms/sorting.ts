/**
 * Sorting algorithms implemented in TypeScript.
 * Each function returns a **new** array and never mutates the input.
 */

/**
 * Bubble sort.
 *
 * Repeatedly steps through the list, compares adjacent elements and swaps them
 * if they are in the wrong order.
 *
 * Time complexity: O(n^2)
 */
export function bubbleSort(numbers: number[]): number[] {
  const arr = [...numbers];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    // After each pass, the largest element among the unsorted part
    // "bubbles up" to its correct position at the end.
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }

  return arr;
}

/**
 * Selection sort.
 *
 * Repeatedly finds the minimum element from the unsorted portion
 * and places it at the beginning.
 *
 * Time complexity: O(n^2)
 */
export function selectionSort(numbers: number[]): number[] {
  const arr = [...numbers];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
      }
    }

    if (minIndex !== i) {
      const temp = arr[i];
      arr[i] = arr[minIndex];
      arr[minIndex] = temp;
    }
  }

  return arr;
}

/**
 * Quick sort (recursive, educational implementation).
 *
 * Picks a pivot element, partitions the array into elements less than the pivot
 * and elements greater than or equal to the pivot, then recursively sorts both parts.
 *
 * Average time complexity: O(n log n)
 * Worst-case time complexity: O(n^2)
 */
export function quickSort(numbers: number[]): number[] {
  if (numbers.length <= 1) {
    return [...numbers];
  }

  const [pivot, ...rest] = numbers;

  const left: number[] = [];
  const right: number[] = [];

  for (const num of rest) {
    if (num < pivot) {
      left.push(num);
    } else {
      right.push(num);
    }
  }

  return [...quickSort(left), pivot, ...quickSort(right)];
}
