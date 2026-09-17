import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createApp } from '../app';
import { createDatabase } from '../db/database';
import { seedCatalog } from '../db/seed';

/** Verify catalog API behavior against a temporary file-backed SQLite database. */
describe('catalog API', () => {
  let database: Database.Database;
  let databasePath: string;

  /** Create an isolated migrated SQLite database for each catalog test. */
  beforeEach((): void => {
    databasePath = path.join(os.tmpdir(), `bookmyshow-catalog-${crypto.randomUUID()}.db`);
    database = createDatabase(databasePath);
  });

  /** Close and remove each temporary database plus SQLite sidecar files. */
  afterEach((): void => {
    database.close();
    fs.rmSync(databasePath, { force: true });
    fs.rmSync(`${databasePath}-wal`, { force: true });
    fs.rmSync(`${databasePath}-shm`, { force: true });
  });

  /** Return all three precisely seeded movie records. */
  it('lists the exact seeded movies', async (): Promise<void> => {
    const response = await request(createApp(database)).get('/api/movies');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { movies: [
      { id: 'mov_paradise', title: 'Paradise' },
      { id: 'mov_bloody_romeo', title: 'Bloody Romeo' },
      { id: 'mov_og2', title: 'OG2' },
    ] } });
  });

  /** Keep repeat catalog seeding idempotent across startup calls. */
  it('does not duplicate records when seeded repeatedly', (): void => {
    seedCatalog(database);
    seedCatalog(database);
    expect(database.prepare('SELECT COUNT(*) AS count FROM movies').get()).toEqual({ count: 3 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM theatres').get()).toEqual({ count: 3 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM movie_theatres').get()).toEqual({ count: 9 });
  });

  /** Reject a theatres request that omits its required movie identifier. */
  it('returns a validation envelope when movieId is missing', async (): Promise<void> => {
    const response = await request(createApp(database)).get('/api/theatres').set('X-Request-Id', 'catalog-request');
    expect(response.status).toBe(400);
    expect(response.headers['x-request-id']).toBe('catalog-request');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.requestId).toBe('catalog-request');
  });

  /** Return no theatres for a nonempty movie identifier that is unknown. */
  it('returns an empty theatre list for an unknown movie', async (): Promise<void> => {
    const response = await request(createApp(database)).get('/api/theatres?movieId=mov_unknown');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { theatres: [] } });
  });

  /** Return every mapped theatre for a known catalog movie. */
  it('returns the three theatres mapped to a selected movie', async (): Promise<void> => {
    const response = await request(createApp(database)).get('/api/theatres?movieId=mov_paradise');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { theatres: [
      { id: 'thr_sandhya', name: 'Sandhya 70mm' },
      { id: 'thr_sudarsham', name: 'Sudharsham 70mm' },
      { id: 'thr_allu', name: 'Allu Cinemas' },
    ] } });
  });
});
