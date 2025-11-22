# Day 3 – TypeScript Utility Library

On Day 3, I built a small reusable TypeScript utility library with helpers for working with **strings** and **arrays**. The goal is to practice writing clean, strongly-typed functions that can be reused across different projects.

## String Helpers (`src/stringUtils.ts`)

- `capitalize(str: string): string` – Capitalizes the first letter and lowercases the rest.
- `toTitleCase(str: string): string` – Converts a sentence so that every word is capitalized.
- `slugify(str: string): string` – Turns a string into a URL-friendly slug (e.g., `"Hello World!!"` → `"hello-world"`).
- `truncate(str: string, maxLength: number): string` – Shortens long strings and appends `"..."` if needed.

## Array Helpers (`src/arrayUtils.ts`)

These functions use **generics** (`<T>`) so they can work with any type (numbers, strings, objects, etc.):

- `unique<T>(items: T[]): T[]` – Removes duplicate values.
- `chunk<T>(items: T[], size: number): T[][]` – Splits an array into smaller chunk arrays.
- `first<T>(items: T[]): T | undefined` – Returns the first item (or `undefined` if the array is empty).
- `last<T>(items: T[]): T | undefined` – Returns the last item (or `undefined` if the array is empty).

## Demo (`src/demo.ts`)

The `demo.ts` file imports all helpers, calls them with example values, and logs the results so I can visually verify their behavior after compiling.

## How to Run

From the `day03-utility-library` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Run the compiled demo script:
   ```bash
   npm start
   ```

You should see labeled output in the console for all string and array utilities.
