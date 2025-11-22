// Demo file for the Day 3 TypeScript Utility Library.
// Here we import and exercise all helper functions so you can see how they behave.

import { capitalize, toTitleCase, slugify, truncate } from "./stringUtils";
import { unique, chunk, first, last } from "./arrayUtils";

console.log("=== String Utilities Demo ===");

const original = "hello WORLD from Typescript!";
console.log("Original:", original);
console.log("capitalize:", capitalize(original));
console.log("toTitleCase:", toTitleCase(original));
console.log("slugify:", slugify("Hello World!! Welcome to Day 3."));
console.log("truncate (maxLength=10):", truncate("This is a long sentence.", 10));

console.log("\n=== Array Utilities Demo ===");

const numbers = [1, 2, 2, 3, 3, 3, 4];
const uniqueNumbers = unique(numbers);
console.log("Original numbers:", numbers);
console.log("unique(numbers):", uniqueNumbers);

const letters = ["a", "b", "c", "d", "e"];
const letterChunks = chunk(letters, 2);
console.log("letters:", letters);
console.log("chunk(letters, 2):", letterChunks);

console.log("first(letters):", first(letters));
console.log("last(letters):", last(letters));

// Generics demo: the same functions can work with different types.
const mixedObjects = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 1, name: "Alice" }, // duplicate object reference
];

console.log("\nGenerics with objects:");
console.log("unique(mixedObjects):", unique(mixedObjects));
console.log("first(mixedObjects):", first(mixedObjects));
console.log("last(mixedObjects):", last(mixedObjects));
