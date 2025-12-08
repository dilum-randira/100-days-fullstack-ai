# Day 11 – Basic Node.js + Express API with TypeScript

On Day 11, I built a small **Node.js + Express** REST API using TypeScript.
This project exposes a simple `/api/items` endpoint to create, read, update,
and delete items stored in memory.

## Features

- TypeScript-powered Express server
- In-memory CRUD API for `Item` objects
- Basic request validation for incoming JSON payloads
- Typed API responses with a small `ApiResponse<T>` helper type

## Project Structure

- `src/server.ts` – Express app bootstrap & middleware
- `src/routes/items.ts` – Routes for `/api/items`
- `src/controllers/itemController.ts` – Request handlers for item endpoints
- `src/models/item.ts` – `Item` interface
- `src/utils/validate.ts` – Simple validation & payload helpers
- `src/types/api.ts` – Shared API response types

## Available Endpoints

Base URL: `http://localhost:4000`

- `GET /` – Health check / root message
- `GET /api/items` – List all items
- `GET /api/items/:id` – Get single item by ID
- `POST /api/items` – Create a new item
- `PUT /api/items/:id` – Update an existing item
- `DELETE /api/items/:id` – Delete an item

### Example Item JSON

```json
{
  "name": "Notebook",
  "quantity": 10,
  "price": 4.99
}
```

## How to Run

From inside the `day11-node-api-basic` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start in dev mode (with auto-reload):
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:4000`.

3. Build and run compiled JS (optional):
   ```bash
   npm run build
   npm start
   ```

You can test the API using a tool like Postman, Insomnia, or `curl`.
