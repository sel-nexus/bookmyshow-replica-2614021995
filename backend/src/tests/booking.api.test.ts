import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createApp } from '../app';
import { createDatabase } from '../db/database';

/** Verify booking HTTP behavior against a temporary file-backed SQLite database. */
describe('booking API', () => {
  let database: Database.Database;
  let databasePath: string;

  /** Create an isolated migrated SQLite database for every booking test. */
  beforeEach((): void => {
    databasePath = path.join(os.tmpdir(), `bookmyshow-booking-${crypto.randomUUID()}.db`);
    database = createDatabase(databasePath);
  });

  /** Close and remove the temporary database plus SQLite sidecar files. */
  afterEach((): void => {
    database.close();
    fs.rmSync(databasePath, { force: true });
    fs.rmSync(`${databasePath}-wal`, { force: true });
    fs.rmSync(`${databasePath}-shm`, { force: true });
  });

  /** Authenticate through the verification endpoint to obtain a real application bearer token. */
  async function authenticatedRequest(): Promise<{ app: ReturnType<typeof createApp>; token: string }> {
    const app = createApp(database);
    const verification = await request(app).post('/api/auth/verify').send({ mobile: '9876543210', otp: '1234' });
    return { app, token: verification.body.data.token as string };
  }

  /** Persist and return a complete authoritative booking confirmation. */
  it('persists a successful booking after verification authentication', async (): Promise<void> => {
    const { app, token } = await authenticatedRequest();
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'CARD' });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ confirmationId: expect.stringMatching(/^bkg_/), movie: { id: 'mov_paradise', title: 'Paradise' }, theatre: { id: 'thr_sandhya', name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'CARD' });
    expect(database.prepare('SELECT movie_id, theatre_id, seats_json, total_price, payment_method FROM bookings').get()).toEqual({ movie_id: 'mov_paradise', theatre_id: 'thr_sandhya', seats_json: '["A1","A2","A3"]', total_price: 450, payment_method: 'CARD' });
  });

  /** Require a valid bearer token before any booking is written. */
  it('rejects a missing bearer token without creating a booking', async (): Promise<void> => {
    const response = await request(createApp(database)).post('/api/bookings').send({ movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'UPI' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  /** Reject client-altered seat selections without creating a booking. */
  it('rejects altered seats as invalid booking context', async (): Promise<void> => {
    const { app, token } = await authenticatedRequest();
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A4'], totalPrice: 450, paymentMethod: 'CARD' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_BOOKING_CONTEXT');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  /** Reject client-altered totals without creating a booking. */
  it('rejects an altered total price as invalid booking context', async (): Promise<void> => {
    const { app, token } = await authenticatedRequest();
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 1, paymentMethod: 'CARD' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_BOOKING_CONTEXT');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  /** Reject unknown movie-theatre combinations without creating a booking. */
  it('rejects an invalid mapping as invalid booking context', async (): Promise<void> => {
    const { app, token } = await authenticatedRequest();
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_unknown', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'CARD' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_BOOKING_CONTEXT');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  /** Reject invalid methods and unknown extra fields before any booking is written. */
  it('rejects invalid payment methods and extra request fields', async (): Promise<void> => {
    const { app, token } = await authenticatedRequest();
    const invalidMethod = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'CASH' });
    const extraField = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'UPI', cardNumber: '4111111111111111' });
    expect(invalidMethod.status).toBe(400);
    expect(extraField.status).toBe(400);
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });
});
