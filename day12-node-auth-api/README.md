# Day 12 – Node.js + Express Auth API with JWT (TypeScript)

On Day 12, I built a small **Node.js + Express** REST API with JWT-based
authentication. It supports user registration, login, and a protected route
that requires a valid token.

> Note: This project uses an in-memory user store and a hardcoded JWT secret
> for learning purposes. Do **not** use this setup directly in production.

## Features

- Register new users with name, email, and password
- Login with email and password to receive a JWT
- Protected `/api/profile` route, accessible only with a valid `Authorization: Bearer <token>` header
- Password hashing using `bcryptjs`
- JWT signing and verification using `jsonwebtoken`
- TypeScript types for users, auth payloads, and responses

## Project Structure

- `src/server.ts` – Express app bootstrap & middleware
- `src/routes/auth.ts` – `/api/auth/register` & `/api/auth/login`
- `src/routes/protected.ts` – `/api/profile` protected route
- `src/controllers/authController.ts` – Register & login logic
- `src/middleware/authMiddleware.ts` – JWT verification middleware
- `src/models/user.ts` – In-memory `User` model & store
- `src/utils/validateUser.ts` – Input validation helpers
- `src/types/auth.ts` – Shared auth-related types

## How to Run

From inside the `day12-node-auth-api` folder:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start in dev mode (with auto-reload):
   ```bash
   npm run dev
   ```

   The API will start on `http://localhost:4001`.

3. Build and run compiled JS (optional):
   ```bash
   npm run build
   npm start
   ```

## Example Usage

### 1. Register

`POST http://localhost:4001/api/auth/register`

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

### 2. Login

`POST http://localhost:4001/api/auth/login`

```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

Response will include a `token` field.

### 3. Access Protected Route

`GET http://localhost:4001/api/profile`

Headers:

```http
Authorization: Bearer <token>
```

You should see a JSON response with the authenticated user's info.
