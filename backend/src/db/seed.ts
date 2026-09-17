import type Database from 'better-sqlite3';

const movies = [
  { id: 'mov_paradise', title: 'Paradise' },
  { id: 'mov_bloody_romeo', title: 'Bloody Romeo' },
  { id: 'mov_og2', title: 'OG2' },
];

const theatres = [
  { id: 'thr_sandhya', name: 'Sandhya 70mm' },
  { id: 'thr_sudarsham', name: 'Sudharsham 70mm' },
  { id: 'thr_allu', name: 'Allu Cinemas' },
];

/** Seed the fixed catalog and all movie-theatre mappings without duplication. */
export function seedCatalog(database: Database.Database): void {
  const insertMovie = database.prepare('INSERT OR IGNORE INTO movies (id, title) VALUES (?, ?)');
  const insertTheatre = database.prepare('INSERT OR IGNORE INTO theatres (id, name) VALUES (?, ?)');
  const insertMapping = database.prepare('INSERT OR IGNORE INTO movie_theatres (movie_id, theatre_id) VALUES (?, ?)');
  const seed = database.transaction((): void => {
    movies.forEach((movie) => insertMovie.run(movie.id, movie.title));
    theatres.forEach((theatre) => insertTheatre.run(theatre.id, theatre.name));
    movies.forEach((movie) => theatres.forEach((theatre) => insertMapping.run(movie.id, theatre.id)));
  });
  seed();
}
