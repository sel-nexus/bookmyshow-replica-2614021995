'use client';

import React, { createContext, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { Movie, Theatre } from './api';

interface CheckoutContextValue {
  movie: Movie | null;
  theatre: Theatre | null;
  chooseMovie: (movie: Movie) => void;
  chooseTheatre: (theatre: Theatre) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

/** Retain the current catalog selections for the forthcoming checkout flow. */
export function CheckoutProvider({ children }: { children: ReactNode }): ReactElement {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [theatre, setTheatre] = useState<Theatre | null>(null);
  const value = useMemo(() => ({
    movie,
    theatre,
    chooseMovie: (nextMovie: Movie): void => {
      setMovie(nextMovie);
      setTheatre(null);
    },
    chooseTheatre: setTheatre,
  }), [movie, theatre]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

/** Read and update the transient selection beneath the checkout provider. */
export function useCheckout(): CheckoutContextValue {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckout must be used within CheckoutProvider.');
  return context;
}
