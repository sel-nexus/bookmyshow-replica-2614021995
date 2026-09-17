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

/** Describe a confirmed booking returned from the authoritative database record. */
export interface BookingRecord {
  confirmationId: string;
  movie: MovieRecord;
  theatre: TheatreRecord;
  seats: string[];
  totalPrice: number;
  paymentMethod: 'CARD' | 'UPI';
}

/** Persist and retrieve users, catalog records, and bookings using SQLite. */
export class SqliteUserRepository {
  /** Initialize the repository with an already migrated SQLite connection. */
  public constructor(private readonly database: Database.Database) {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        confirmation_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        movie_id TEXT NOT NULL,
        theatre_id TEXT NOT NULL,
        seats_json TEXT NOT NULL,
        total_price INTEGER NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('CARD', 'UPI')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (movie_id) REFERENCES movies(id),
        FOREIGN KEY (theatre_id) REFERENCES theatres(id)
      );
    `);
  }

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

  /** Create one booking after validating its user and catalogue mapping inside an immediate transaction. */
  public createBooking(userId: string, movieId: string, theatreId: string, seats: string[], totalPrice: number, paymentMethod: 'CARD' | 'UPI'): BookingRecord | null {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const user = this.database.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: string } | undefined;
      const context = this.database.prepare(`
        SELECT movies.id AS movieId, movies.title AS movieTitle, theatres.id AS theatreId, theatres.name AS theatreName
        FROM movie_theatres
        INNER JOIN movies ON movies.id = movie_theatres.movie_id
        INNER JOIN theatres ON theatres.id = movie_theatres.theatre_id
        WHERE movie_theatres.movie_id = ? AND movie_theatres.theatre_id = ?
      `).get(movieId, theatreId) as { movieId: string; movieTitle: string; theatreId: string; theatreName: string } | undefined;
      if (!user || !context) {
        this.database.exec('ROLLBACK');
        return null;
      }
      const confirmationId = `bkg_${randomUUID().replace(/-/g, '')}`;
      this.database.prepare(`
        INSERT INTO bookings (confirmation_id, user_id, movie_id, theatre_id, seats_json, total_price, payment_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(confirmationId, userId, movieId, theatreId, JSON.stringify(seats), totalPrice, paymentMethod, new Date().toISOString());
      this.database.exec('COMMIT');
      return {
        confirmationId,
        movie: { id: context.movieId, title: context.movieTitle },
        theatre: { id: context.theatreId, name: context.theatreName },
        seats,
        totalPrice,
        paymentMethod,
      };
    } catch (error: unknown) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
