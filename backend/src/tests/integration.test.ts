import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createApp } from '../app';
import { createDatabase } from '../db/database';

/** Exercise authentication, catalog, and booking routers against one persisted SQLite file. */
describe('auth, catalog, and booking integration', () => {
  let database: Database.Database;
  let databasePath: string;

  beforeEach((): void => {
    databasePath = path.join(os.tmpdir(), `bookmyshow-integration-${crypto.randomUUID()}.db`);
    database = createDatabase(databasePath);
  });

  afterEach((): void => {
    database.close();
    fs.rmSync(databasePath, { force: true });
    fs.rmSync(`${databasePath}-wal`, { force: true });
    fs.rmSync(`${databasePath}-shm`, { force: true });
  });

  it('chains verify, movies, theatres, and protected booking while persisting user ownership and references', async (): Promise<void> => {
    const app = createApp(database);
    const verified = await request(app).post('/api/auth/verify').send({ mobile: '9876543210', otp: '1234' });
    expect(verified.status).toBe(200);
    const movies = await request(app).get('/api/movies');
    expect(movies.status).toBe(200);
    const movieId = movies.body.data.movies[0].id as string;
    const theatres = await request(app).get(`/api/theatres?movieId=${movieId}`);
    expect(theatres.status).toBe(200);
    const theatreId = theatres.body.data.theatres[0].id as string;
    const booking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${verified.body.data.token as string}`).send({ movieId, theatreId, seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'CARD' });
    expect(booking.status).toBe(201);
    const persisted = database.prepare('SELECT confirmation_id, user_id, movie_id, theatre_id FROM bookings WHERE confirmation_id = ?').get(booking.body.data.confirmationId) as { confirmation_id: string; user_id: string; movie_id: string; theatre_id: string };
    expect(persisted).toEqual({ confirmation_id: booking.body.data.confirmationId, user_id: verified.body.data.user.id, movie_id: movieId, theatre_id: theatreId });
  });

  it('rejects an invalid catalog mapping after authentication without writing a booking', async (): Promise<void> => {
    const app = createApp(database);
    const verified = await request(app).post('/api/auth/verify').send({ mobile: '9876543210', otp: '1234' });
    const booking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${verified.body.data.token as string}`).send({ movieId: 'mov_missing', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'UPI' });
    expect(booking.status).toBe(409);
    expect(booking.body.error.code).toBe('INVALID_BOOKING_CONTEXT');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });
});