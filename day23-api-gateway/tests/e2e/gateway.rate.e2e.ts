import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import express from 'express';
import { setupTestDB, teardownTestDB } from '../../day16-inventory-service/vitest.setup';
import { config } from '../src/config';

// Gateway uses proxies; for E2E we'll mount inventory app directly to simulate routing
import inventoryApp from '../../day16-inventory-service/src/app';

let gateway: express.Express;

beforeAll(async () => {
  await setupTestDB();
  gateway = express();
  gateway.use(express.json());
  // mount inventory app under /api/inventory
  gateway.use('/api/inventory', inventoryApp);
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Gateway rate limiting E2E', () => {
  it('should return 429 when gateway limits exceeded', async () => {
    const results: number[] = [];
    for (let i = 0; i < 120; i++) {
      // eslint-disable-next-line no-await-in-loop
      const r = await request(gateway).get('/api/inventory');
      results.push(r.status);
    }
    const throttled = results.filter((s) => s === 429).length;
    expect(throttled).toBeGreaterThan(0);
  });
});
