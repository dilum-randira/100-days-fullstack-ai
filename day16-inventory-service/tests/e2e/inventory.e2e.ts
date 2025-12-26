import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import app from '../../src/app';
import { setupTestDB, teardownTestDB } from '../../vitest.setup';
import { InventoryItem } from '../../src/models/InventoryItem';
import { OutboxEvent } from '../../src/models/OutboxEvent';

beforeAll(async () => {
  await setupTestDB();
  await InventoryItem.deleteMany({}).exec();
  await OutboxEvent.deleteMany({}).exec();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Inventory E2E', () => {
  it('should create, adjust, and write outbox event once', async () => {
    // create
    const createRes = await request(app)
      .post('/api/v1/inventory')
      .send({ name: 'widget', productName: 'Widget', quantity: 10, unit: 'pcs', location: 'A1', organizationId: 'org-test' });
    expect(createRes.status).toBe(201);
    const item = createRes.body.data;
    expect(item).toHaveProperty('_id');

    // adjust with idempotency key
    const idempotencyKey = 'test-idem-1';
    const adjustRes = await request(app)
      .post(`/api/v1/inventory/${item._id}/adjust`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ delta: -2 });
    expect(adjustRes.status).toBe(200);

    // repeat same idempotency key -> should return same response and not create duplicate outbox event
    const adjustRes2 = await request(app)
      .post(`/api/v1/inventory/${item._id}/adjust`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ delta: -2 });
    expect(adjustRes2.status).toBe(200);

    const outboxEvents = await OutboxEvent.find({ aggregateType: 'InventoryItem', aggregateId: item._id, eventType: 'InventoryAdjusted' }).exec();
    expect(outboxEvents.length).toBe(1);
  });

  it('should enforce adaptive rate limiter eventually', async () => {
    const results: number[] = [];
    for (let i = 0; i < 120; i++) {
      // fire many parallel requests
      // list endpoint
      // using await to avoid flooding too fast
      // small sleep could be added but we aim to exceed limiter
      // eslint-disable-next-line no-await-in-loop
      const r = await request(app).get('/api/v1/inventory');
      results.push(r.status);
    }

    const throttled = results.filter((s) => s === 429).length;
    expect(throttled).toBeGreaterThan(0);
  });
});
