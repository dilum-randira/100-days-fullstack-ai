// Example usage script for the advanced TypeScript utility library.
// This file is meant to be run with `npm run demo` using ts-node.

import {
  sum,
  average,
  clamp,
  roundTo,
  capitalize,
  capitalizeWords,
  truncate,
  isEmail,
  formatDate,
  daysBetween,
  isWeekend,
  addDays,
  unique,
  groupBy,
  chunk,
} from "../src/index.js";

console.log("=== Math Utilities ===");
const nums = [1, 2, 3, 4, 5];
console.log("numbers:", nums);
console.log("sum:", sum(nums));
console.log("average:", average(nums));
console.log("clamp(10, 0, 5):", clamp(10, 0, 5));
console.log("roundTo(3.14159, 3):", roundTo(3.14159, 3));

console.log("\n=== String Utilities ===");
const message = "hello WORLD from typescript";
console.log("original:", message);
console.log("capitalize:", capitalize(message));
console.log("capitalizeWords:", capitalizeWords(message));
console.log("truncate (maxLength=10):", truncate("This is a longer sentence.", 10));
console.log("isEmail('user@example.com'):", isEmail("user@example.com"));
console.log("isEmail('not-an-email'):", isEmail("not-an-email"));

console.log("\n=== Date Utilities ===");
const today = new Date();
const nextWeek = addDays(today, 7);
console.log("today:", formatDate(today));
console.log("nextWeek:", formatDate(nextWeek));
console.log("daysBetween(today, nextWeek):", daysBetween(today, nextWeek));
console.log("isWeekend(today):", isWeekend(today));

console.log("\n=== Array Utilities ===");
const items = ["apple", "banana", "apple", "orange"];
console.log("items:", items);
console.log("unique:", unique(items));

const people = [
  { id: 1, role: "admin" },
  { id: 2, role: "user" },
  { id: 3, role: "admin" },
];
const byRole = groupBy(people, (p) => p.role);
console.log("groupBy role:", byRole);

console.log("chunk([1, 2, 3, 4, 5], 2):", chunk([1, 2, 3, 4, 5], 2));
