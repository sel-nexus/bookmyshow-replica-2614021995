import type { MovieRecord, SqliteUserRepository, TheatreRecord } from '../repositories/sqliteRepository';

/** Provide read-only catalog queries over the SQLite repository. */
export class CatalogService {
  /** Initialize catalog reads with the shared persistence repository. */
  public constructor(private readonly repository: SqliteUserRepository) {}

  /** Return every seeded movie in stable display order. */
  public listMovies(): MovieRecord[] {
    return this.repository.listMovies();
  }

  /** Return theatres mapped to a known or unknown movie identifier. */
  public listTheatres(movieId: string): TheatreRecord[] {
    return this.repository.listTheatresForMovie(movieId);
  }
}
