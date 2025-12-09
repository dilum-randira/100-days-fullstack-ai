# Day 14 – MongoDB JWT Auth API

A Node.js + Express REST API in TypeScript that implements JWT authentication with access + refresh tokens using MongoDB via Mongoose.

## 🚀 Overview

Features:

- User registration with hashed passwords (bcryptjs)
- Login with email + password
- Access tokens (short-lived JWT)
- Refresh tokens (long-lived JWT stored in DB)
- Refresh endpoint to rotate tokens
- Logout endpoint to invalidate refresh tokens
- Protected route (`/api/secret`) that requires a valid access token
- Clean architecture with models, services, controllers, routes, and middleware

## 📁 Project Structure

```bash
day14-mongo-auth/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── server.ts
    ├── app.ts
    ├── db.ts
    ├── models/
    │   ├── User.ts
    │   └── RefreshToken.ts
    ├── controllers/
    │   └── authController.ts
    ├── services/
    │   ├── authService.ts
    │   └── userService.ts
    ├── routes/
    │   ├── auth.ts
    │   └── protected.ts
    ├── middleware/
    │   ├── authenticate.ts
    │   └── errorHandler.ts
    ├── utils/
    │   ├── tokens.ts
    │   └── validateUserInput.ts
    ├── types/
    │   └── express.d.ts
    └── index.d.ts
```

## 🧩 Tech Stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- bcryptjs for password hashing
- CORS + body-parser

## 🔧 Setup Instructions

1. **Go to the project folder**

```bash
cd day14-mongo-auth
```

2. **Install dependencies**

```bash
npm install
```

3. **Create `.env` from example**

```bash
cp .env.example .env
```

Edit `.env` and update values as needed:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/day14auth
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

4. **Run in development mode**

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/day14auth` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | required |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | required |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token TTL | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL | `7d` |

## 📡 API Endpoints

### 1. Register

**POST** `/api/auth/register`

**Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123"
}
```

**Response**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

### 2. Login

**POST** `/api/auth/login`

**Body**

```json
{
  "email": "john@example.com",
  "password": "StrongPass123"
}
```

**Response** – same structure as register.

### 3. Refresh Tokens

**POST** `/api/auth/refresh`

**Body**

```json
{
  "refreshToken": "<refresh-token>"
}
```

**Response**

```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 4. Logout

**POST** `/api/auth/logout`

**Body**

```json
{
  "refreshToken": "<refresh-token>"
}
```

**Response**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 5. Protected Route

**GET** `/api/secret`

**Headers**

```http
Authorization: Bearer <access-token>
```

**Response**

```json
{
  "success": true,
  "message": "You have accessed a protected route!",
  "user": {
    "id": "...",
    "email": "john@example.com"
  }
}
```

## 🧠 What Day 14 Teaches

- How to structure an authentication API in a real-world way
- How to hash and verify passwords with bcryptjs
- How to generate and validate JWT access + refresh tokens
- How to store refresh tokens securely in MongoDB
- How to protect routes with middleware and Express type augmentation
- How to keep code clean with services, controllers, and utilities

## ✅ Next Ideas

- Add email verification
- Add password reset flow
- Add role-based authorization (admin/user)
- Add rate limiting to auth endpoints
