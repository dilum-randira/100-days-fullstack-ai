import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import app from '../src/app';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB } from '../vitest.setup';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';

beforeAll(async () => {
  await setupTestDB();
  await User.deleteMany({}).exec();
  const pw = await bcrypt.hash('password123', 8);
  await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: pw });
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Auth E2E', () => {
  it('should login and refresh token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('data');
    const tokens = loginRes.body.data;
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');

    // refresh
    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('data');
  });
});
