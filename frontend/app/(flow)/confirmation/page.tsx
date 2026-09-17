'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, type ReactElement } from 'react';
import { AppShell } from '../../../components/AppShell';
import { TicketCard } from '../../../components/TicketCard';
import { useAuth } from '../../../lib/auth-context';
import { CheckoutProvider, useCheckout } from '../../../lib/checkout-context';

/** Render an authenticated confirmation from the transient backend response. */
function ConfirmationFlow(): ReactElement {
  const router = useRouter();
  const { token, user } = useAuth();
  const { confirmation } = useCheckout();
  const isAuthenticated = Boolean(user && token);

  useEffect((): void => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return <AppShell><p role="status">Returning to login…</p></AppShell>;
  if (!confirmation) {
    return <AppShell><section className="auth-stage" aria-labelledby="confirmation-unavailable-title"><p className="eyebrow">CONFIRMATION UNAVAILABLE</p><h1 id="confirmation-unavailable-title">We could not find a ticket.</h1><p>Your booking confirmation is available only immediately after a successful payment.</p><Link className="primary-link" href="/dashboard">Return to browsing</Link></section></AppShell>;
  }
  return <AppShell><section className="auth-stage"><TicketCard ticket={confirmation} /></section></AppShell>;
}

/** Provide the transient booking response to the protected confirmation route. */
export default function ConfirmationPage(): ReactElement {
  return <CheckoutProvider><ConfirmationFlow /></CheckoutProvider>;
}
