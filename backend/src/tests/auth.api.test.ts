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

/** Verify the LLD authentication contract against a file-backed SQLite database. */
describe('auth API', () => {
  let database: Database.Database;
  let databasePath: string;

  beforeEach((): void => {
    databasePath = path.join(os.tmpdir(), `bookmyshow-auth-${crypto.randomUUID()}.db`);
    database = createDatabase(databasePath);
  });

  afterEach((): void => {
    database.close();
    fs.rmSync(databasePath, { force: true });
    fs.rmSync(`${databasePath}-wal`, { force: true });
    fs.rmSync(`${databasePath}-shm`, { force: true });
  });

  it('returns the exact LLD login acknowledgement without writing a user', async (): Promise<void> => {
    const response = await request(createApp(database)).post('/api/auth/login').set('X-Request-Id', 'request-123').send({ mobile: ' 9876543210 ' });
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('request-123');
    expect(response.body).toEqual({ data: { mobile: '9876543210', nextStep: 'VERIFY_OTP', message: 'Demo OTP login initiated' } });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
  });

  it.each([
    [{}, 'omitted mobile'],
    [{ mobile: 9876543210 }, 'numeric mobile'],
    [{ mobile: '   ' }, 'blank mobile'],
    [{ mobile: '1234abc' }, 'malformed mobile'],
    [{ mobile: "9876543210'; DROP TABLE users;--" }, 'SQL-like mobile'],
    [{ mobile: '<script>alert(1)</script>' }, 'XSS-like mobile'],
  ])('rejects login with $1 using a stable validation envelope', async (body: object, _caseName: string): Promise<void> => {
    const response = await request(createApp(database)).post('/api/auth/login').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR', requestId: expect.any(String), details: expect.any(Array) });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
  });

  it('returns the exact LLD verification response and a 30-minute issuer JWT', async (): Promise<void> => {
    const response = await request(createApp(database)).post('/api/auth/verify').send({ mobile: '9876543210', otp: '1234' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ token: expect.any(String), tokenType: 'Bearer', expiresIn: 1800, user: { id: expect.any(String), mobile: '9876543210' } });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users WHERE mobile = ?').get('9876543210')).toEqual({ count: 1 });
    const claims = jwt.verify(response.body.data.token, config.jwtSecret, { issuer: config.jwtIssuer }) as jwt.JwtPayload;
    expect(claims.sub).toBe(response.body.data.user.id);
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(1800);
  });

  it.each([
    [{ mobile: '9876543210' }, 'omitted OTP', 400, 'VALIDATION_ERROR'],
    [{ mobile: '9876543210', otp: 1234 }, 'numeric OTP', 400, 'VALIDATION_ERROR'],
    [{ mobile: '9876543210', otp: ' ' }, 'blank OTP', 400, 'VALIDATION_ERROR'],
    [{ mobile: '9876543210', otp: '12a4' }, 'malformed OTP', 400, 'VALIDATION_ERROR'],
    [{ mobile: '1234abc', otp: '1234' }, 'malformed mobile', 400, 'VALIDATION_ERROR'],
    [{ mobile: '9876543210', otp: '0000' }, 'invalid OTP', 401, 'INVALID_OTP'],
  ])('rejects verification with $1 without persisting a user', async (body: object, _caseName: string, status: number, code: string): Promise<void> => {
    const response = await request(createApp(database)).post('/api/auth/verify').send(body);
    expect(response.status).toBe(status);
    expect(response.body.error).toMatchObject({ code, requestId: expect.any(String), details: expect.any(Array) });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
  });

  it('reports service health through the data envelope', async (): Promise<void> => {
    const response = await request(createApp(database)).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });
});
