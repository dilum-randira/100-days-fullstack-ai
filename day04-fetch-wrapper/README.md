# Day 4 – TypeScript Fetch Wrapper / HTTP Client

On Day 4, I built a small **TypeScript HTTP client** that wraps the Fetch API.
The goal is to have a reusable, typed way to make HTTP requests with a base URL,
default headers, and simple helper methods for common HTTP verbs.

## Features

- `HttpClient` class with:
  - Configurable `baseUrl` and `defaultHeaders`
  - Generic `request<T>` method for typed JSON responses
  - Convenience helpers: `get`, `post`, `put`, `delete`
- Strong TypeScript types for configuration and responses
- Simple example script using the public JSONPlaceholder API

## Project Structure

- `src/httpClient.ts` – Implementation of the `HttpClient` class
- `src/example.ts` – Example usage against `https://jsonplaceholder.typicode.com`

## How to Run

From inside the `day04-fetch-wrapper` folder:

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

You should see the result of a `GET /posts/1` and a demo `POST /posts` request logged to the console.
