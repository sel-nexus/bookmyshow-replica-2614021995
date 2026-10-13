/** Real SQLite and Chromium transport fixtures used only by the appearance journeys. */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { CDPSession, Page } from '@playwright/test';

interface Mapping { movie_id: string; theatre_id: string }
interface FixtureDatabase {
  prepare(sql: string): {
    all(...parameters: string[]): Mapping[];
    run(...parameters: string[]): unknown;
  };
  transaction(action: () => void): () => void;
  close(): void;
}

/** Remove only Paradise's mappings from the existing E2E database, restoring exact rows even on failure. */
export async function withEmptyTheatreFixture(journey: () => Promise<void>): Promise<void> {
  const backendRequire = createRequire(resolve(process.cwd(), '../backend/package.json'));
  const Database = backendRequire('better-sqlite3') as new (
    path: string, options: { fileMustExist: boolean }
  ) => FixtureDatabase;
  const database = new Database('/tmp/bookmyshow-playwright.db', {
    fileMustExist: true,
  });
  let mappings: Mapping[] = [];
  let cleared = false;
  try {
    database.transaction(() => {
      mappings = database.prepare(
        'SELECT movie_id, theatre_id FROM movie_theatres WHERE movie_id = ? ORDER BY theatre_id'
      ).all('mov_paradise');
      if (mappings.length === 0) throw new Error('Expected seeded Paradise mappings before empty-state fixture');
      database.prepare('DELETE FROM movie_theatres WHERE movie_id = ?').run('mov_paradise');
    })();
    cleared = true;
    await journey();
  } finally {
    try {
      if (cleared) {
        database.transaction(() => {
          database.prepare('DELETE FROM movie_theatres WHERE movie_id = ?').run('mov_paradise');
          const insert = database.prepare('INSERT INTO movie_theatres (movie_id, theatre_id) VALUES (?, ?)');
          for (const row of mappings) insert.run(row.movie_id, row.theatre_id);
        })();
        const restored = database.prepare(
          'SELECT movie_id, theatre_id FROM movie_theatres WHERE movie_id = ? ORDER BY theatre_id'
        ).all('mov_paradise');
        if (JSON.stringify(restored) !== JSON.stringify(mappings)) {
          throw new Error('Empty-state fixture failed to restore Paradise mappings');
        }
      }
    } finally {
      database.close();
    }
  }
}

/** Delay genuine HTTP transport, not response data, long enough to capture the rendered pending state. */
export async function throttleCatalogue(page: Page): Promise<CDPSession> {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false, latency: 15000, downloadThroughput: -1, uploadThroughput: -1,
  });
  return session;
}

/** Restore normal transport before leaving the test, including assertion failures. */
export async function restoreNetwork(session: CDPSession): Promise<void> {
  try {
    await session.send('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    });
  } finally {
    await session.detach();
  }
}
