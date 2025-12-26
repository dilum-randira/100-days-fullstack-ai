import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import app from '../../src/app';
import { setupTestDB, teardownTestDB } from '../../vitest.setup';
import { FeatureFlag } from '../../src/models/FeatureFlag';

beforeAll(async () => {
  await setupTestDB();
  // Ensure qc.webhook feature is enabled for this test
  await FeatureFlag.deleteMany({}).exec();
  await FeatureFlag.create({ key: 'qc.webhook', enabled: true, description: 'enable qc webhook in tests' } as any);
});

afterAll(async () => {
  await teardownTestDB();
});

describe('QC webhook E2E', () => {
  it('qc webhook responds OK and is idempotent', async () => {
    const idem = 'qc-idem-1';

    const r1 = await request(app)
      .post('/api/v1/inventory/qc/webhook')
      .set('Idempotency-Key', idem)
      .set('x-organization-id', 'org-test')
      .send({ status: 'PASS', organizationId: 'org-test', batchId: 'batch-1' });

    expect(r1.status).toBe(200);
    expect(r1.body.success).toBe(true);

    const r2 = await request(app)
      .post('/api/v1/inventory/qc/webhook')
      .set('Idempotency-Key', idem)
      .set('x-organization-id', 'org-test')
      .send({ status: 'PASS', organizationId: 'org-test', batchId: 'batch-1' });

    expect(r2.status).toBe(200);
    expect(r2.body.success).toBe(true);
    // response should be identical due to idempotency middleware storage
    expect(r2.body).toEqual(r1.body);
  });
});
