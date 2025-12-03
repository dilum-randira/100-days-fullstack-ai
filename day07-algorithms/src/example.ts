import {
  bubbleSort,
  selectionSort,
  quickSort,
} from "./algorithms/sorting";
import { linearSearch, binarySearch } from "./algorithms/searching";
import { findMax, findMin, buildFrequencyMap } from "./algorithms/utils";

const numbers = [5, 3, 8, 4, 2, 7, 1, 10, 6];

console.log("Original numbers:", numbers);

const bubbleSorted = bubbleSort(numbers);
const selectionSorted = selectionSort(numbers);
const quickSorted = quickSort(numbers);

console.log("\n=== Sorting ===");
console.log("Bubble sort:", bubbleSorted);
console.log("Selection sort:", selectionSorted);
console.log("Quick sort:", quickSorted);

console.log("\n=== Searching ===");

const target = 7;
console.log(`Linear search for ${target}:`, linearSearch(numbers, target));
console.log(
  `Binary search for ${target} in quickSorted array:`,
  binarySearch(quickSorted, target),
);

console.log("\n=== Utils ===");
console.log("Max:", findMax(numbers));
console.log("Min:", findMin(numbers));
console.log("Frequency map:", buildFrequencyMap(numbers));
