# Day 10 – React Form Validation with Reusable Validators

On Day 10, I built a small **React + TypeScript + Vite** app that demonstrates
form validation using reusable, strongly-typed validators and a custom hook.

## Key Ideas

- Reusable `Validator` and `ValidationResult` types in `src/validators.ts`.
- Composable validators: `required`, `minLength`, `isEmail`, `combineValidators`.
- `useFormValidation` hook that manages values, errors, touched fields, and submit.
- Reusable `TextField` + `ErrorText` components for consistent form UI.

## Project Structure

- `src/validators.ts` – Validation types & helper functions.
- `src/hooks/useFormValidation.ts` – Custom hook for form logic.
- `src/components/TextField.tsx` – Labeled text field with error display.
- `src/components/ErrorText.tsx` – Renders a validation error message.
- `src/App.tsx` – Example form (name, email, password).
- `src/main.tsx` – Vite React entry point.
- `src/styles.css` – Simple card-style layout and form styling.

## How to Run

From inside the `day10-react-form-validation` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

Then open the printed URL (usually `http://localhost:5173`).
As you type and blur fields, you should see validation messages, and on submit
with valid data the submitted values will be displayed below the form.
