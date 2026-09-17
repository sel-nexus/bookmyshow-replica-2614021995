'use client';

import React, { createContext, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { Movie, Theatre } from './api';

export type PaymentMethod = 'CARD' | 'UPI';

interface CheckoutContextValue {
  movie: Movie | null;
  theatre: Theatre | null;
  seats: string[];
  totalPrice: number;
  paymentMethod: PaymentMethod | null;
  confirmation: { confirmationId: string } | null;
  chooseMovie: (movie: Movie) => void;
  chooseTheatre: (theatre: Theatre) => void;
  applyPreset: () => void;
  choosePayment: (method: PaymentMethod) => void;
  beginPay: () => void;
  reset: () => void;
  cancel: () => void;
  setConfirmation: (confirmation: { confirmationId: string } | null) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);
let snapshot: Pick<CheckoutContextValue, 'movie' | 'theatre' | 'seats' | 'totalPrice' | 'paymentMethod' | 'confirmation'> = { movie: null, theatre: null, seats: [], totalPrice: 0, paymentMethod: null, confirmation: null };

/** Retain transient catalog and checkout selections across the flow route transition. */
export function CheckoutProvider({ children }: { children: ReactNode }): ReactElement {
  const [movie, setMovie] = useState<Movie | null>(snapshot.movie);
  const [theatre, setTheatre] = useState<Theatre | null>(snapshot.theatre);
  const [seats, setSeats] = useState<string[]>(snapshot.seats);
  const [totalPrice, setTotalPrice] = useState(snapshot.totalPrice);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(snapshot.paymentMethod);
  const [confirmation, setConfirmationState] = useState<{ confirmationId: string } | null>(snapshot.confirmation);
  const value = useMemo(() => ({
    movie, theatre, seats, totalPrice, paymentMethod, confirmation,
    chooseMovie: (nextMovie: Movie): void => { snapshot = { movie: nextMovie, theatre: null, seats: [], totalPrice: 0, paymentMethod: null, confirmation: null }; setMovie(nextMovie); setTheatre(null); setSeats([]); setTotalPrice(0); setPaymentMethod(null); setConfirmationState(null); },
    chooseTheatre: (nextTheatre: Theatre): void => { snapshot = { ...snapshot, theatre: nextTheatre }; setTheatre(nextTheatre); },
    applyPreset: (): void => { snapshot = { ...snapshot, seats: ['A1', 'A2', 'A3'], totalPrice: 450 }; setSeats(['A1', 'A2', 'A3']); setTotalPrice(450); },
    choosePayment: (method: PaymentMethod): void => { snapshot = { ...snapshot, paymentMethod: method }; setPaymentMethod(method); },
    beginPay: (): void => undefined,
    reset: (): void => { snapshot = { movie: null, theatre: null, seats: [], totalPrice: 0, paymentMethod: null, confirmation: null }; setMovie(null); setTheatre(null); setSeats([]); setTotalPrice(0); setPaymentMethod(null); setConfirmationState(null); },
    cancel: (): void => undefined,
    setConfirmation: (nextConfirmation: { confirmationId: string } | null): void => { snapshot = { ...snapshot, confirmation: nextConfirmation }; setConfirmationState(nextConfirmation); },
  }), [movie, theatre, seats, totalPrice, paymentMethod, confirmation]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

/** Read and update the transient selection beneath the checkout provider. */
export function useCheckout(): CheckoutContextValue {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckout must be used within CheckoutProvider.');
  return context;
}
