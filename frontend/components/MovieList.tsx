import React, { type ReactElement } from 'react';
import type { Movie } from '../lib/api';

interface MovieListProps {
  movies: Movie[];
  selectedMovieId: string | null;
  onSelect: (movie: Movie) => void;
}

/** Render accessible movie selection controls from a loaded catalog. */
export function MovieList({ movies, selectedMovieId, onSelect }: MovieListProps): ReactElement {
  return <section aria-labelledby="movies-heading"><h2 id="movies-heading">Choose a movie</h2><div role="list" aria-label="Movies">{movies.map((movie) => <button key={movie.id} type="button" aria-pressed={selectedMovieId === movie.id} onClick={() => onSelect(movie)}>{movie.title}</button>)}</div></section>;
}
