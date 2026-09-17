import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

/** Describe the safe user representation returned from persistence. */
export interface UserRecord {
  id: string;
  mobile: string;
  createdAt: string;
}

/** Describe a catalog movie returned from persistence. */
export interface MovieRecord {
  id: string;
  title: string;
}

/** Describe a theatre returned from persistence. */
export interface TheatreRecord {
  id: string;
  name: string;
}

/** Persist and retrieve users by mobile number using SQLite. */
export class SqliteUserRepository {
  /** Initialize the repository with an already migrated SQLite connection. */
  public constructor(private readonly database: Database.Database) {}

  /** Find a user for a mobile number, if one exists. */
  public findByMobile(mobile: string): UserRecord | null {
    const row = this.database.prepare('SELECT id, mobile, created_at AS createdAt FROM users WHERE mobile = ?').get(mobile) as UserRecord | undefined;
    return row ?? null;
  }

  /** Create a user once or return the existing user for the mobile number. */
  public createOrFindByMobile(mobile: string): UserRecord {
    const existing = this.findByMobile(mobile);
    if (existing) return existing;
    const user: UserRecord = { id: randomUUID(), mobile, createdAt: new Date().toISOString() };
    this.database.prepare('INSERT INTO users (id, mobile, created_at) VALUES (?, ?, ?)').run(user.id, user.mobile, user.createdAt);
    return user;
  }

  /** List movies in their stable seeded order. */
  public listMovies(): MovieRecord[] {
    return this.database.prepare('SELECT id, title FROM movies ORDER BY rowid').all() as MovieRecord[];
  }

  /** List theatres mapped to a movie in their stable seeded order. */
  public listTheatresForMovie(movieId: string): TheatreRecord[] {
    return this.database.prepare('SELECT theatres.id, theatres.name FROM theatres INNER JOIN movie_theatres ON movie_theatres.theatre_id = theatres.id WHERE movie_theatres.movie_id = ? ORDER BY theatres.rowid').all(movieId) as TheatreRecord[];
  }
}
