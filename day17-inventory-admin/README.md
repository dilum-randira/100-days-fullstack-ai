# Day 17 - Inventory Admin Dashboard

React + TypeScript admin dashboard for your inventory service. Built with Vite, Tailwind CSS, React Router, and Recharts.

## Features

- JWT-based login with access + refresh tokens
- Protected routes with role-aware UI (roles: `admin`, `staff`, `viewer`)
- Inventory list with filters, pagination, and quick actions
- Item detail view with change logs and quantity adjustment
- Batch management (create batches, create items from batch)
- Analytics: stock by location, trends, and top items visualizations

## Getting Started

### 1. Install dependencies

```bash
cd day17-inventory-admin
npm install
```

### 2. Environment variables

Create a `.env` file in `day17-inventory-admin/`:

```bash
VITE_API_URL=http://localhost:3000
```

This should point to your existing Node/Express inventory API.

### 3. Run the dev server

```bash
npm run dev
```

Open the URL printed in your terminal (usually `http://localhost:5173`).

## Auth Flow

- Login sends `POST /api/auth/login` with `{ email, password }`.
- On success the frontend stores `accessToken`, `refreshToken`, and `user` in `localStorage`.
- Subsequent API calls attach `Authorization: Bearer <accessToken>`.
- On `401` responses, the client automatically attempts a refresh via `POST /api/auth/refresh` using the stored `refreshToken`.
- If refresh fails, the user is logged out and redirected to `/login`.

## Pages

- **Login**: Simple form with email/password and basic validation.
- **Dashboard**:
  - Calls `/api/inventory/summary` and `/api/inventory/trends?days=30`.
  - Shows total items, quantity, low-stock count, and total value.
  - Renders a Recharts line chart of inventory trends.
- **Inventory**:
  - Calls `/api/inventory` with search/filter/pagination query params.
  - Columns: product name, SKU, batch, quantity, min threshold, status, location.
  - Actions: view details (all roles), adjust (admin/staff), delete (admin).
- **Item Detail**:
  - Calls `/api/inventory/:id` and `/api/inventory/:id/logs`.
  - Shows item info, batch link, and change logs.
  - Adjust quantity via `/api/inventory/:id/adjust`.
- **Batches**:
  - Calls `/api/batches`.
  - Admin/staff can create new batches.
  - Create items from batch via `/api/batches/:id/create-items`.
- **Analytics**:
  - Uses `/api/inventory/stats`, `/api/inventory/trends?days=30`, and `/api/inventory/top?limit=10`.
  - Charts for stock by location, trends, and top items.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router v6
- Recharts

## Suggested Commit Message

```bash
git add .
git commit -m "Day 17: React admin dashboard (login, inventory, batches, analytics, RBAC-aware UI)"
```
