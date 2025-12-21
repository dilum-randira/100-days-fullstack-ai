# Day 24 - Backend Hardening & Multi-Service Architecture

This day focuses on evolving the project into a production-style multi-service backend with:

- AI inference-ready endpoints
- Async notifications
- Real-time WebSocket updates with auth and scaling
- Dedicated analytics microservice
- API Gateway with centralized auth and rate limiting
- Distributed tracing via correlation IDs
- MongoDB transactions with Mongoose sessions
- Soft deletes and restore endpoints
- Data export/backup endpoints
- Feature flags and kill switches
- Early multi-tenant foundations

> This README is a high-level overview. See each day's folder for implementation details.

---

## Services Overview

By Day 24, the system includes several Node.js/TypeScript services:

- **Auth Service** (`day14-mongo-auth`)
  - JWT-based auth (access + refresh tokens)
  - MongoDB + Mongoose
  - Central config & validation

- **Inventory Service** (`day16-inventory-service`)
  - Inventory CRUD, logs, analytics hooks
  - Redis caching + BullMQ jobs
  - WebSocket real-time updates (Socket.IO)
  - AI-assisted quality prediction endpoint
  - Soft deletes and restore operations
  - Data export endpoints (JSON / CSV)
  - Feature flags, kill switches, multi-tenant prep

- **Analytics Service** (`day23-analytics-service`)
  - Read-only analytics (inventory summary, top items, trends)
  - Exposes HTTP API consumed by Inventory service

- **API Gateway** (`day23-api-gateway`)
  - Central entrypoint for clients
  - Routes traffic to Auth, Inventory, Analytics
  - Centralized JWT validation, rate limiting, CORS, and logging

---

## Key Features Implemented

### 1. AI Inference-Ready API (Inventory Service)

**File:** `day16-inventory-service/src/services/aiService.ts`

- `predictQuality(input)` implements a simple rule-based model returning:

  ```ts
  {
    grade: 'A' | 'B' | 'C';
    confidence: number; // 0.0 - 1.0
  }
  ```

- Designed so it can later call TensorFlow or a Python microservice without changing the API.

**Endpoint:**

- `POST /api/ai/predict-quality`

  - Body:

    ```json
    {
      "size": 42,
      "colorScore": 88,
      "defectCount": 1,
      "moisture": 11.5
    }
    ```

  - Response:

    ```json
    {
      "success": true,
      "data": { "grade": "A", "confidence": 0.92 },
      "requestId": "...optional...",
      "meta": { "durationMs": 5 }
    }
    ```

- Input is validated (via Zod) in `aiController.ts`.

---

### 2. Async Notification System

**File:** `day16-inventory-service/src/services/notificationService.ts`

- `sendNotification(type, payload)` supports:
  - `LOW_STOCK`
  - `QC_FAILED`
  - `SYSTEM_ALERT`
- Current behavior:
  - Logs notification intent via Winston logger
  - Enqueues a BullMQ job when queue is configured
- Non-blocking, fire-and-forget design so it can later integrate with Email/SMS providers.

**Triggers (via domain events):**

- Large inventory adjustments
- Low stock detected
- QC failures

---

### 3. Real-Time WebSockets with Auth & Scaling

**File:** `day16-inventory-service/src/sockets.ts`

- Integrated Socket.IO on top of the HTTP server.
- JWT-based handshake authentication:
  - Requires token on connection
  - Decodes user and attaches to `socket.data.user`
- Role-based rooms:
  - `role:admin`, `role:staff`, `role:viewer`, plus `user:{userId}` rooms.
- Event filtering:
  - `inventory:update` only to admin/staff
  - Summary/analytics events to viewers + staff + admin
- Scaling-ready:
  - Uses Redis adapter (`@socket.io/redis-adapter`) so multiple instances share events.

---

### 4. Analytics Microservice

**Folder:** `day23-analytics-service`

- Express + Mongoose microservice that reads from MongoDB (read-only).
- Endpoints:
  - `GET /api/analytics/inventory/summary`
  - `GET /api/analytics/inventory/trending?limit=`
  - `GET /api/analytics/inventory/top?limit=`
- Used by the Inventory service via `analyticsClient.ts` with:
  - Timeout + retry logic
  - Redis-backed fallback cache

---

### 5. API Gateway

**Folder:** `day23-api-gateway`

- Express-based gateway with:
  - `GET/POST /api/auth/*` routed to Auth service
  - `GET/POST /api/inventory/*` routed to Inventory service
  - `GET/POST /api/analytics/*` routed to Analytics service
- Features:
  - Central JWT validation
  - Rate limiting
  - Request ID and correlation ID generation and propagation
  - Standardized error responses for upstream failures

---

### 6. Distributed Tracing (Correlation IDs)

- Gateway generates and propagates:
  - `X-Request-Id`
  - `X-Correlation-Id`
- Services attach IDs to:
  - `req.requestId`
  - `req.correlationId`
- Logs and error responses include correlation IDs for easier traceability across services.

---

### 7. MongoDB Transactions via Mongoose Sessions

- Critical operations are wrapped in transactions using `mongoose.startSession()` and `session.withTransaction`-style patterns.
- Example: inventory quantity adjustment (`adjustQuantity`):
  - Updates the item quantity
  - Writes a log entry
  - Commits or rolls back as a single unit
- Transaction lifecycle is logged (`transaction.start`, `transaction.commit`, `transaction.abort`).

---

### 8. Soft Deletes & Restore Endpoints

- Models updated with soft-delete fields:
  - `isDeleted: boolean`
  - `deletedAt?: Date | null`
- Delete operations now:
  - Set `isDeleted = true` and `deletedAt = now`
- Queries default to excluding deleted docs.
- Optional `includeDeleted=true` support on list endpoints.
- Restore routes:
  - `POST /api/inventory/:id/restore`

No data is physically removed, aligning with safety and audit requirements.

---

### 9. Data Export & Backup

- Export service streams large datasets without loading everything into memory.
- Endpoints (inventory service):
  - `GET /api/inventory/export/inventory`
  - `GET /api/inventory/export/logs`
  - `GET /api/inventory/export/batches` (placeholder until Batch model exists)
- Formats:
  - JSON (default)
  - CSV (`?format=csv`)
- Admin-only; all actions are logged as `audit.export` events.

---

### 10. Feature Flags & Kill Switches

- `FeatureFlag` model stores:
  - `key`, `enabled`, `description`
- Service API functions:
  - `getFlag(key)`
  - `isEnabled(key)`
  - `setFlag(key, enabled, description?)`
- Middleware: `requireFeature(key)`
  - Returns **503** when a feature is disabled.
- Gated features:
  - AI inference (`ai.inference`)
  - Inventory adjust endpoint (`inventory.adjust`)
  - QC webhook (`qc.webhook`)
- Admin management endpoints:
  - `GET /api/features`
  - `POST /api/features/:key/enable`
  - `POST /api/features/:key/disable`

---

### 11. Multi-Tenant Foundations

- `Organization` model with `{ name, slug, plan, isActive }`.
- `organizationId` added to key documents:
  - User
  - InventoryItem
  - InventoryLog
  - (Batch, when implemented on backend)
- JWT payload extended with `organizationId`.
- Request context includes `{ userId, role, organizationId }`.
- Queries are being refactored to be scoped by `organizationId` to prevent cross-tenant access.
- Optional `superadmin` role can bypass strict tenant scoping for admin tooling.

---

## Running the Services (High Level)

Each service has its own `README` and `package.json` scripts, but the common flow is:

```bash
# Install dependencies (from each service folder)
npm install

# Run in dev mode
npm run dev

# Build and run
npm run build
npm start
```

Ensure the following are configured via environment variables:

- `MONGO_URI` for each service
- `REDIS_URL` for inventory queues and Socket.IO adapter
- `JWT_ACCESS_SECRET` (shared between auth and gateway)
- `AUTH_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `ANALYTICS_SERVICE_URL` for the gateway

---

## Next Steps

- Finalize Batch backend model and wire it into:
  - Transactions
  - Soft delete + restore
  - Export endpoints
  - Domain events (BatchConsumed, BatchQCPassed)
- Harden multi-tenant query scoping across all services.
- Add end-to-end tests for feature flags, tracing, and multi-tenancy.
