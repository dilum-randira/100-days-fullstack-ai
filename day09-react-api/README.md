# Day 9 – React + TypeScript API Demo

On Day 9, I built a small **React + TypeScript** app using **Vite** that fetches data
from an API and shows clear **loading**, **error**, and **success** states.

The app uses the public JSONPlaceholder API to load a list of posts.

## Features

- Typed `Post` interface and `fetchPosts` helper in `src/api.ts`.
- `Loader` component for the loading state.
- `ErrorMessage` component for errors.
- `PostCard` and `PostList` components to display fetched posts.
- `App` component that manages loading, error, and success states.

## Project Structure

- `src/api.ts` – Typed API helper for fetching posts.
- `src/components/Loader.tsx` – Loading spinner + message.
- `src/components/ErrorMessage.tsx` – Displays an error message.
- `src/components/PostCard.tsx` – Renders a single post.
- `src/components/PostList.tsx` – Renders a grid of posts.
- `src/App.tsx` – Main UI and state management.
- `src/main.tsx` – Vite React entry point.
- `src/styles.css` – Basic layout and component styles.

## How to Run

From inside the `day09-react-api` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

Then open the printed URL (usually `http://localhost:5173`) in your browser.
You should see the app load posts, show a spinner while loading, and display
an error message if the request fails.
