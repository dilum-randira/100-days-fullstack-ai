# Day 3 – Advanced TypeScript Utility Library

On Day 3, I built a more advanced reusable **TypeScript utility library** that contains helpers for working with **numbers**, **strings**, **dates**, and **arrays**.

The library is written with strong typing, clear JSDoc comments, and is fully covered by unit tests using **Vitest**. There is also an example script that shows how to use the utilities in a real project.

## What This Library Contains

- **Math utilities** (`mathUtils`): `sum`, `average`, `clamp`, `roundTo`
- **String utilities** (`stringUtils`): `capitalize`, `capitalizeWords`, `truncate`, `isEmail`
- **Date utilities** (`dateUtils`): `formatDate`, `daysBetween`, `isWeekend`, `addDays`
- **Array utilities** (`arrayUtils`): `unique`, `groupBy`, `chunk` (with generics)

All functions are exported via the main barrel file `src/index.ts`, so you can import them from a single place.

## Features

- ✅ Strong TypeScript typing
- ✅ Helpful JSDoc comments with examples
- ✅ Unit tests written with **Vitest**
- ✅ Example usage script in `examples/demo.ts`

## How to Use

From inside the `day03-utility-library` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run tests with Vitest:
   ```bash
   npm run test
   ```

3. Build the TypeScript library:
   ```bash
   npm run build
   ```

4. Run the demo script (uses ts-node to run TypeScript directly):
   ```bash
   npm run demo
   ```

You should see human-readable output in the console that demonstrates functions from each module.
