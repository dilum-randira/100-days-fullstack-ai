// Entry point for the Day 2 TypeScript basics project.
// Here we import and use the utility functions defined in utils.ts.

import {
  add,
  formatName,
  isAdult,
  wrapInArray,
  filterNumbers,
} from "./utils";

// Call `add`
const sum = add(5, 7);
console.log("[add] 5 + 7 =", sum);

// Call `formatName`
const fullName = formatName({
  firstName: "Dilum",
  middleName: "R.",
  lastName: "Randira",
});
console.log("[formatName] Full name =", fullName);

const shortName = formatName({
  firstName: "Ada",
  lastName: "Lovelace",
});
console.log("[formatName] Short name =", shortName);

// Call `isAdult`
const age = 21;
console.log(`[isAdult] Is ${age} an adult?`, isAdult(age));

// Call generic `wrapInArray`
const wrappedNumber = wrapInArray(42);
console.log("[wrapInArray] Wrapped number =", wrappedNumber);

const wrappedString = wrapInArray("hello TypeScript");
console.log("[wrapInArray] Wrapped string =", wrappedString);

// Call `filterNumbers` with a mix of numbers and strings
const mixedValues = [1, "2", 3, "four", 5];
const onlyNumbers = filterNumbers(mixedValues);
console.log("[filterNumbers] Input values =", mixedValues);
console.log("[filterNumbers] Only numbers =", onlyNumbers);
