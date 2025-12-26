import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import app from '../../src/app';
import { setupTestDB, teardownTestDB } from '../../vitest.setup';
import { OutboxEvent } from '../../src/models/OutboxEvent';

beforeAll(async () => {
  await setupTestDB();
  await OutboxEvent.deleteMany({}).exec();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Event publishing E2E', () => {
  it('outbox events are created for inventory adjustments', async () => {
    // create item
    const createRes = await request(app)
      .post('/api/v1/inventory')
      .send({ name: 'widget2', productName: 'Widget2', quantity: 5, unit: 'pcs', location: 'B1', organizationId: 'org-test' });
    expect(createRes.status).toBe(201);
    const item = createRes.body.data;

    const idempotencyKey = 'evt-test-1';
    const adjustRes = await request(app)
      .post(`/api/v1/inventory/${item._id}/adjust`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ delta: -1 });
    expect(adjustRes.status).toBe(200);

    const events = await OutboxEvent.find({ aggregateId: item._id }).exec();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('InventoryAdjusted');
  });
});
