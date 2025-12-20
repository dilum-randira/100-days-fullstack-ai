# Day 23 - API Gateway

Simple TypeScript API Gateway that sits in front of:

- Auth service (`AUTH_SERVICE_URL`)
- Inventory service (`INVENTORY_SERVICE_URL`)
- Analytics service (`ANALYTICS_SERVICE_URL`)

## Features

- Central JWT validation (optional; downstream can also enforce)
- Rate limiting at the gateway level
- Request ID generation and propagation via `x-request-id`
- Routing:
  - `/api/auth/*` -> auth service
  - `/api/inventory/*` -> inventory service
  - `/api/analytics/*` -> analytics service
- Standardized error responses for gateway-handled errors

## Environment variables

- `GATEWAY_PORT` (default: `4000`)
- `JWT_ACCESS_SECRET` (shared with auth service)
- `AUTH_SERVICE_URL` (default: `http://localhost:4000`)
- `INVENTORY_SERVICE_URL` (default: `http://localhost:3000`)
- `ANALYTICS_SERVICE_URL` (default: `http://localhost:5000`)
