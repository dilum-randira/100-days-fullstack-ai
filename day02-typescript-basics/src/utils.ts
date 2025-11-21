// Utility functions for the Day 2 TypeScript basics project.

// `number` type: both parameters must be numbers, and the return value is a number.
export function add(a: number, b: number): number {
  return a + b;
}

// Object type with required firstName & lastName and optional middleName using `?`.
export function formatName(user: {
  firstName: string;
  lastName: string;
  middleName?: string; // optional property
}): string {
  const { firstName, middleName, lastName } = user;
  return middleName
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`;
}

// Simple boolean result based on a `number` input.
export function isAdult(age: number): boolean {
  return age >= 18;
}

// Generic function: `T` can be any type (string, number, object, etc.).
// The function returns an array containing that value.
export function wrapInArray<T>(value: T): T[] {
  return [value];
}

// Union type: each element can be a `number` OR a `string`.
// The function filters out only the numbers.
export function filterNumbers(values: (number | string)[]): number[] {
  return values.filter((value): value is number => typeof value === "number");
}
