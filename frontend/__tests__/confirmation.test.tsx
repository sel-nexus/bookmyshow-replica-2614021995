import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConfirmationPage from '../app/(flow)/confirmation/page';
import type { BookingConfirmation } from '../lib/api';

const checkoutState: { confirmation: BookingConfirmation | null } = {
  confirmation: null,
};

vi.mock('../lib/auth-context', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', mobile: '9876543210', createdAt: '2026-01-01T00:00:00.000Z' }, token: 'jwt-token' })),
}));
vi.mock('../lib/checkout-context', () => ({
  CheckoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCheckout: vi.fn(() => checkoutState),
}));
vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

/** Verify confirmation rendering never reconstructs ticket data from checkout selections. */
describe('confirmation page', () => {
  beforeEach((): void => {
    checkoutState.confirmation = null;
  });

  it('renders every ticket value from the authoritative booking response', (): void => {
    checkoutState.confirmation = {
      confirmationId: 'bkg_authoritative_1',
      movie: { id: 'mov_server_value', title: 'Server Movie' },
      theatre: { id: 'thr_server_value', name: 'Server Theatre' },
      seats: ['B4', 'B5'],
      totalPrice: 999,
      paymentMethod: 'UPI',
    };

    render(<ConfirmationPage />);

    expect(screen.getByText('bkg_authoritative_1')).toBeInTheDocument();
    expect(screen.getByText('Server Movie')).toBeInTheDocument();
    expect(screen.getByText('Server Theatre')).toBeInTheDocument();
    expect(screen.getByText('B4, B5')).toBeInTheDocument();
    expect(screen.getByText('₹999')).toBeInTheDocument();
    expect(screen.getByText('UPI')).toBeInTheDocument();
  });

  it('offers an accessible dashboard link instead of fabricating a missing ticket', (): void => {
    render(<ConfirmationPage />);

    expect(screen.getByRole('heading', { name: 'We could not find a ticket.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to browsing' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByText('Confirmation ID')).not.toBeInTheDocument();
  });
});
