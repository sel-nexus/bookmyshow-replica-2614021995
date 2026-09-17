import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config';

/** Open a SQLite database and apply the idempotent application migration. */
export function createDatabase(databasePath = config.databasePath): Database.Database {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  const migrationPath = path.resolve(__dirname, '../../migrations/001_init.sql');
  database.exec(fs.readFileSync(migrationPath, 'utf8'));
  return database;
}

