# E2E Tests

Run Vitest at repository root. Tests use mongodb-memory-server to create ephemeral MongoDB instances per service.

## Prerequisites

Install dev dependencies in each service before running tests:

- vitest
- supertest
- mongodb-memory-server

Example from the repository root:

```sh
npm install --workspace day14-mongo-auth vitest supertest mongodb-memory-server --save-dev
npm install --workspace day16-inventory-service vitest supertest mongodb-memory-server --save-dev
npm install --workspace day23-api-gateway vitest supertest --save-dev
```

## Running Tests

Then run tests inside each service:

```sh
# Auth service
cd day14-mongo-auth
npx vitest run

# Inventory service
cd day16-inventory-service
npx vitest run

# Gateway tests
cd day23-api-gateway
npx vitest run
```

## Notes

- Tests are TypeScript and do not mock core logic. They start apps via Express app exports and use mongodb-memory-server.
- Ensure service devDependencies are installed before running.
