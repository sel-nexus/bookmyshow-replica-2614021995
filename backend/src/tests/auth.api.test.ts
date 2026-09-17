import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { config } from '../config';
import { createDatabase } from '../db/database';
import type Database from 'better-sqlite3';

describe('auth API', () => {
  let database: Database.Database;
  let databasePath: string;

  beforeEach(() => {
    databasePath = path.join(os.tmpdir(), `bookmyshow-auth-${crypto.randomUUID()}.db`);
    database = createDatabase(databasePath);
  });

  afterEach(() => {
    database.close();
    fs.rmSync(databasePath, { force: true });
    fs.rmSync(`${databasePath}-wal`, { force: true });
    fs.rmSync(`${databasePath}-shm`, { force: true });
  });

  it('acknowledges a valid mobile login and echoes a request ID', async () => {
    const response = await request(createApp(database)).post('/api/auth/login').set('X-Request-Id', 'request-123').send({ mobile: '9876543210' });
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('request-123');
    expect(response.body).toEqual({ data: { mobile: '9876543210', nextStep: 'VERIFY_OTP', message: 'OTP sent. Use 1234 for this demo.' } });
  });

  it('rejects a malformed mobile number', async () => {
    const response = await request(createApp(database)).post('/api/auth/login').send({ mobile: '1234abc' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('verifies the demo OTP, persists a user, and returns a 30-minute issuer JWT', async () => {
    const response = await request(createApp(database)).post('/api/auth/verify').send({ mobile: '9876543210', otp: '1234' });
    expect(response.status).toBe(200);
    expect(response.body.data.user.mobile).toBe('9876543210');
    expect(database.prepare('SELECT COUNT(*) AS count FROM users WHERE mobile = ?').get('9876543210')).toEqual({ count: 1 });
    const claims = jwt.verify(response.body.data.token, config.jwtSecret, { issuer: config.jwtIssuer }) as jwt.JwtPayload;
    expect(claims.sub).toBe(response.body.data.user.id);
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(1800);
  });

  it('does not persist a user when the OTP is invalid', async () => {
    const response = await request(createApp(database)).post('/api/auth/verify').send({ mobile: '9876543210', otp: '0000' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_OTP');
    expect(database.prepare('SELECT COUNT(*) AS count FROM users WHERE mobile = ?').get('9876543210')).toEqual({ count: 0 });
  });

  it('reports service health through the data envelope', async () => {
    const response = await request(createApp(database)).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });
});
