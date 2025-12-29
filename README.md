# Backend Services: Auth and Inventory

## Project Overview

This repository contains two backend services used throughout the "100 Days Full Stack + AI" project:

- **Auth Service (day14-mongo-auth)**: Provides user registration, login, JWT-based authentication, token refresh, and protected routes.
- **Inventory Service (day16-inventory-service)**: Manages inventory items, quantities, logs, summaries, statistics, and background jobs (Redis + BullMQ) for analytics and low-stock alerts.

Both services are written in TypeScript, expose REST APIs, and are designed for deployment to cloud platforms such as Render or Railway.

## Tech Stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Redis (caching and background jobs)
- BullMQ (job queue for inventory analytics and alerts)
- Winston + Morgan (structured logging and HTTP access logs)
- Helmet + CORS + rate limiting (security)
- Swagger (OpenAPI documentation)

## Environment Variables

### Common

| Variable             | Service                | Required | Description                                      |
|----------------------|------------------------|----------|--------------------------------------------------|
| `NODE_ENV`           | both                   | yes      | `development` or `production`                    |
| `PORT`               | both                   | yes      | Port to bind the HTTP server to                 |
| `MONGO_URI`          | both                   | yes      | MongoDB connection string                        |
| `REDIS_URL`          | inventory, auth (opt.) | yes      | Redis connection string                          |
| `CORS_ORIGINS`       | both                   | yes      | Comma-separated list of allowed origins          |
| `LOG_LEVEL`          | both                   | no       | Winston log level (default: `info`)             |

### Auth Service (day14-mongo-auth)

| Variable               | Required | Description                           |
|------------------------|----------|---------------------------------------|
| `JWT_ACCESS_SECRET`    | yes      | Secret used to sign access tokens     |
| `JWT_REFRESH_SECRET`   | yes      | Secret used to sign refresh tokens    |
| `ACCESS_TOKEN_EXPIRES_IN`  | no   | Access token lifetime (e.g. `15m`)    |
| `REFRESH_TOKEN_EXPIRES_IN` | no   | Refresh token lifetime (e.g. `7d`)    |

### Inventory Service (day16-inventory-service)

| Variable      | Required | Description                              |
|---------------|----------|------------------------------------------|
| `REDIS_URL`   | yes      | Redis URL used for caching and BullMQ    |

## Local Development

### Auth Service

From `day14-mongo-auth/`:

1. Install dependencies:
   - `npm install`
2. Configure environment (e.g. `.env`):
   - `NODE_ENV=development`
   - `PORT=4000`
   - `MONGO_URI=mongodb://localhost:27017/auth-dev`
   - `JWT_ACCESS_SECRET=...`
   - `JWT_REFRESH_SECRET=...`
   - `CORS_ORIGINS=http://localhost:5173`
3. Run in development mode:
   - `npm run dev`
4. Build and run in production mode:
   - `npm run build`
   - `npm run start:prod`

### Inventory Service

From `day16-inventory-service/`:

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `NODE_ENV=development`
   - `PORT=3000`
   - `MONGO_URI=mongodb://localhost:27017/inventory-dev`
   - `REDIS_URL=redis://localhost:6379`
   - `CORS_ORIGINS=http://localhost:5173`
3. Run in development mode:
   - `npm run dev`
4. Build and run in production mode:
   - `npm run build`
   - `npm run start:prod`

## Production Deployment (Render / Railway)

- Set `NODE_ENV=production`.
- Configure `PORT` according to the platform (Render/Railway usually inject this automatically).
- Set `MONGO_URI` to a managed MongoDB instance.
- Set `REDIS_URL` to a managed Redis instance (inventory service and optional for auth).
- Set all JWT secrets and CORS origins as environment variables.
- Ensure health checks point to `/health` and readiness checks to `/ready`.

### Notes

- In production, CORS wildcards are rejected; `CORS_ORIGINS` must list specific origins.
- Logs are emitted in JSON format to stdout for integration with platform log viewers.

## Health & Monitoring Endpoints

Both services expose the following endpoints:

- `GET /health` – basic liveness
- `GET /ready` – readiness based on MongoDB connection state
- `GET /metrics` – in-memory metrics (request counts, error counts, average response time)

Inventory service additionally exposes operational endpoints under `/api/v1/inventory`.

## Security Features

- **Helmet** for secure HTTP headers.
- **CORS** with explicit origin allowlist (no wildcard in production).
- **Rate limiting** on sensitive endpoints (login, token refresh, inventory adjustments).
- **JWT-based authentication** in the auth service with access and refresh tokens.
- **RBAC-ready**: user model and tokens carry user identifiers and roles, which can be enforced in middleware.
- **Request IDs** attached to every request and logged for correlation.
- **No stack traces in HTTP responses** in production; full details are logged server-side only.

## Common Errors & Fixes

- **Server does not start**
  - Check that all required environment variables are set (see tables above).
  - Check MongoDB and Redis connectivity.
  - Inspect startup logs for configuration validation errors.

- **Cannot connect to MongoDB**
  - Verify `MONGO_URI` and network connectivity.
  - For local development, ensure MongoDB is running on the expected port.

- **Cannot connect to Redis**
  - Verify `REDIS_URL` and Redis service status.
  - Inventory service will continue to function without caching, but performance may be reduced.

- **CORS errors in browser**
  - Ensure the frontend origin is included in `CORS_ORIGINS`.
  - In production, ensure there is no `*` entry.

- **JWT/auth failures**
  - Confirm access/refresh secrets are set and consistent across deployments.
  - Check token expiry configuration and system clock skew.

## Runbook

### If the server does not start

1. Check platform logs for configuration errors.
2. Confirm all required environment variables are present.
3. Confirm MongoDB and Redis are reachable from the service.
4. For local development, run `npm run build` and look for TypeScript compilation errors.

### If MongoDB is down

1. Check the database instance status (managed service dashboard or `mongo` shell).
2. Verify the `MONGO_URI` value and credentials.
3. Review application logs for connection retry attempts and errors.

### If Redis is down (inventory service)

1. Check the Redis instance status.
2. Verify `REDIS_URL` and network access.
3. Review logs for Redis connection errors; the API should still be available but without caching or background job processing.

### Debugging auth issues

1. Enable a lower log level in development: `LOG_LEVEL=debug`.
2. Check the `/api/v1/auth/login` and `/api/v1/auth/refresh` responses for standardized error messages.
3. Verify JWT signatures using the configured secrets.
4. Confirm client applications send the `Authorization: Bearer <token>` header on protected routes.

### Inspecting logs

- **Development**: logs are colorized and printed to the console.
- **Production**: logs are structured JSON on stdout; use your platforms log viewer or ship them to a log aggregation service.

## Example Commands

Assuming local ports:

### Health and readiness

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/metrics
```

Auth service:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/metrics
```

### Sample auth requests

Register:

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123"}'
```

Login:

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

### Sample inventory requests

List items:

```bash
curl http://localhost:3000/api/v1/inventory
```

Create item:

```bash
curl -X POST http://localhost:3000/api/v1/inventory \
  -H "Content-Type: application/json" \
  -d '{"productName":"Sample","location":"Main","quantity":10,"unit":"pcs","minThreshold":2}'
```

shfl fhios
auhd uac cksl abck
