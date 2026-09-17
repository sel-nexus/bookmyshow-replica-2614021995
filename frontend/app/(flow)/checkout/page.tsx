'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, type ReactElement } from 'react';
import { AppShell } from '../../../components/AppShell';
import { PaymentForm } from '../../../components/PaymentForm';
import { SeatGrid } from '../../../components/SeatGrid';
import { createBooking } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { CheckoutProvider, useCheckout } from '../../../lib/checkout-context';

/** Render the authenticated checkout controls around a selected show. */
function CheckoutFlow(): ReactElement {
  const router = useRouter();
  const { token, user } = useAuth();
  const { movie, theatre, seats, totalPrice, paymentMethod, confirmation, applyPreset, choosePayment, beginPay, cancel, reset, setConfirmation } = useCheckout();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCheckout = Boolean(user && token && movie && theatre);

  useEffect(() => (): void => { if (timer.current) clearTimeout(timer.current); cancel(); }, [cancel]);
  useEffect((): void => { if (!canCheckout) router.replace('/dashboard'); }, [canCheckout, router]);
  if (!canCheckout || !movie || !theatre || !token) return <AppShell><p role="status">Returning to dashboard…</p></AppShell>;

  function pay(): void {
    if (processing || !token || !movie || !theatre || !paymentMethod || seats.length === 0) return;
    const bookingToken = token;
    const movieId = movie.id;
    const theatreId = theatre.id;
    const selectedPaymentMethod = paymentMethod;
    beginPay();
    setError(null);
    setProcessing(true);
    timer.current = setTimeout((): void => {
      void createBooking(bookingToken, { movieId, theatreId, seats, totalPrice, paymentMethod: selectedPaymentMethod }).then((result) => {
        setConfirmation({ confirmationId: result.confirmationId });
      }).catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : 'Unable to complete your booking.');
      }).finally(() => { setProcessing(false); timer.current = null; });
    }, 2000);
  }

  return <AppShell><section className="auth-stage checkout-stage" aria-labelledby="checkout-title"><p className="eyebrow">CHECKOUT</p><h1 id="checkout-title">Confirm the big-screen plan.</h1><p>{movie.title} at {theatre.name}</p><button className="secondary-button" type="button" onClick={applyPreset} disabled={processing}>Select Seats</button><SeatGrid seats={seats} /><p className="booking-total">Total: ₹{totalPrice}</p><PaymentForm method={paymentMethod} onChoose={choosePayment} disabled={processing} />{error && <p role="alert" className="form-error">{error}</p>}{confirmation ? <p role="status">Booking confirmed: {confirmation.confirmationId}</p> : <button className="checkout-button" type="button" onClick={pay} disabled={processing || !paymentMethod || seats.length === 0}>{processing ? 'Processing Payment...' : 'Pay ₹450'}</button>}<button className="text-button" type="button" disabled={processing} onClick={(): void => { reset(); router.push('/dashboard'); }}>Cancel checkout</button><Link className="text-link" href="/dashboard">Back to shows</Link></section></AppShell>;
}

/** Provide transient selection state to the protected checkout route. */
export default function CheckoutPage(): ReactElement {
  return <CheckoutProvider><CheckoutFlow /></CheckoutProvider>;
}
