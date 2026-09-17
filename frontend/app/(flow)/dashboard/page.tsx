'use client';

import Link from 'next/link';
import React, { useEffect, useState, type ReactElement } from 'react';
import { AppShell } from '../../../components/AppShell';
import { MovieList } from '../../../components/MovieList';
import { TheatreSelector } from '../../../components/TheatreSelector';
import { getMovies, getTheatres, type Movie, type Theatre } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { CheckoutProvider, useCheckout } from '../../../lib/checkout-context';

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; data: T };

/** Render catalog controls after an authenticated user reaches the dashboard. */
function CatalogDashboard(): ReactElement {
  const { user } = useAuth();
  const { movie, theatre, chooseMovie, chooseTheatre } = useCheckout();
  const [movies, setMovies] = useState<LoadState<Movie[]>>({ status: 'loading' });
  const [theatres, setTheatres] = useState<LoadState<Theatre[]> | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    getMovies().then((result) => {
      if (active) setMovies({ status: 'loaded', data: result.movies });
    }).catch((error: unknown) => {
      if (active) setMovies({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load movies.' });
    });
    return (): void => { active = false; };
  }, []);

  /** Select a movie and load only the theatres returned for that movie. */
  function selectMovie(nextMovie: Movie): void {
    chooseMovie(nextMovie);
    setTheatres({ status: 'loading' });
    getTheatres(nextMovie.id).then((result) => {
      setTheatres({ status: 'loaded', data: result.theatres });
    }).catch((error: unknown) => {
      setTheatres({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load theatres.' });
    });
  }

  if (!user) {
    return (
      <AppShell>
        <section className="auth-stage">
          <p className="eyebrow">SIGN IN REQUIRED</p>
          <h1>Pick up your booking after login.</h1>
          <p>Your movie selection is available once you verify your mobile number.</p>
          <Link className="text-link" href="/login">
            Go to login
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="auth-stage" aria-labelledby="dashboard-title">
        <p className="eyebrow">NOW SHOWING</p>
        <h1 id="dashboard-title">Choose the show that moves you.</h1>
        <p>Start with a film, then select one of its cinemas.</p>
        {movies.status === 'loading' && <p role="status">Loading movies…</p>}
        {movies.status === 'error' && <p role="alert">{movies.message}</p>}
        {movies.status === 'loaded' && movies.data.length === 0 && (
          <p role="status">No movies are available right now.</p>
        )}
        {movies.status === 'loaded' && movies.data.length > 0 && (
          <MovieList
            movies={movies.data}
            selectedMovieId={movie?.id ?? null}
            onSelect={selectMovie}
          />
        )}
        {theatres?.status === 'loading' && <p role="status">Loading theatres…</p>}
        {theatres?.status === 'error' && <p role="alert">{theatres.message}</p>}
        {theatres?.status === 'loaded' && theatres.data.length === 0 && (
          <p role="status">No theatres are available for this movie.</p>
        )}
        {theatres?.status === 'loaded' && theatres.data.length > 0 && (
          <TheatreSelector
            theatres={theatres.data}
            selectedTheatreId={theatre?.id ?? null}
            onSelect={chooseTheatre}
          />
        )}
        {movie && theatre && (
          <>
            <p role="status">
              Selected: {movie.title} at {theatre.name}.
            </p>
            <Link className="primary-link" href="/checkout">
              Continue to checkout
            </Link>
          </>
        )}
      </section>
    </AppShell>
  );
}

/** Provide catalog selection state beneath the application root providers. */
export default function DashboardPage(): ReactElement {
  return (
    <CheckoutProvider>
      <CatalogDashboard />
    </CheckoutProvider>
  );
}
