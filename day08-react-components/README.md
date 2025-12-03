# Day 8 – Reusable React Components

On Day 8, I used **React + TypeScript + Vite** to build a small set of reusable UI
components that can be composed into simple UIs.

## Components

- **Button** – A typed button with `primary`, `secondary`, and `outline` variants.
- **Card** – A container with a title and body content.
- **Input** – A controlled input with an optional label.
- **ThemeToggle** – A light/dark mode toggle that updates the page theme.

All components are written in TypeScript and designed to be easy to reuse and extend.

## Project Structure

- `src/components/Button.tsx` – Reusable button component.
- `src/components/Card.tsx` – Card layout component.
- `src/components/Input.tsx` – Controlled input component.
- `src/components/ThemeToggle.tsx` – Theme toggle button.
- `src/App.tsx` – Showcases all components together.
- `src/main.tsx` – Vite React entry point.
- `src/styles.css` – Minimal styles and utility-like classes.

## How to Run

From inside the `day08-react-components` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

Then open the printed URL (usually `http://localhost:5173`) in your browser.
You should see a small demo page showing buttons, a card, a controlled input,
and a theme toggle.
