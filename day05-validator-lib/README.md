# Day 5 – TypeScript Validation Library

On Day 5, I built a small **TypeScript validation library** for common form-style checks
like required fields, length limits, email, password strength, phone numbers,
and numeric ranges.

The validators are composable and use simple types so they are easy to read and reuse.

## Project Structure

- `src/types.ts` – Shared `ValidationResult` and generic `Validator<T>` type.
- `src/validators.ts` – Individual validator functions and a `combineValidators` helper.
- `src/index.ts` – Barrel file that re-exports types and validators.
- `src/example.ts` – Example "user registration" validation.

## Available Types

- `ValidationResult` – `{ valid: boolean; message?: string }`
- `Validator<T = unknown>` – `(value: T) => ValidationResult`

## Available Validators

- `required`
- `minLength(min)`
- `maxLength(max)`
- `isEmail`
- `isStrongPassword`
- `isPhoneNumber`
- `isNumberInRange(min, max)`
- `combineValidators(...validators)` – runs validators in order and returns the first failure.

## How to Run

From inside the `day05-validator-lib` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript project:
   ```bash
   npm run build
   ```

3. Run the example script:
   ```bash
   npm start
   ```

You should see validation results for the example registration form printed in the console.
