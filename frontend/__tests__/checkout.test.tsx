import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from '../app/(flow)/checkout/page';
import { createBooking } from '../lib/api';

const authenticatedUser = {
  id: 'user-1',
  mobile: '9876543210',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const authState: { user: typeof authenticatedUser | null; token: string | null } = {
  user: authenticatedUser,
  token: 'jwt-token',
};
const router = {
  replace: vi.fn(),
  push: vi.fn(),
};
const checkoutState = {
  movie: { id: 'mov_paradise', title: 'Paradise' } as { id: string; title: string } | null,
  theatre: { id: 'thr_sandhya', name: 'Sandhya 70mm' } as { id: string; name: string } | null,
  seats: [] as string[],
  totalPrice: 0,
  paymentMethod: null as 'CARD' | 'UPI' | null,
  confirmation: null as { confirmationId: string } | null,
  applyPreset: vi.fn((): void => {
    checkoutState.seats = ['A1', 'A2', 'A3'];
    checkoutState.totalPrice = 450;
  }),
  choosePayment: vi.fn((method: 'CARD' | 'UPI'): void => {
    checkoutState.paymentMethod = method;
  }),
  beginPay: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
  setConfirmation: vi.fn((confirmation: { confirmationId: string } | null): void => {
    checkoutState.confirmation = confirmation;
  }),
};

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  createBooking: vi.fn(),
}));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn(() => authState) }));
vi.mock('../lib/checkout-context', () => ({
  CheckoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCheckout: vi.fn(() => checkoutState),
}));
vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const mockedCreateBooking = vi.mocked(createBooking);

/** Verify the timed, safe checkout payment interaction. */
describe('checkout flow', () => {
  beforeEach((): void => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    authState.user = authenticatedUser;
    authState.token = 'jwt-token';
    checkoutState.movie = { id: 'mov_paradise', title: 'Paradise' };
    checkoutState.theatre = { id: 'thr_sandhya', name: 'Sandhya 70mm' };
    checkoutState.seats = [];
    checkoutState.totalPrice = 0;
    checkoutState.paymentMethod = null;
    checkoutState.confirmation = null;
    mockedCreateBooking.mockResolvedValue({
      confirmationId: 'bkg_test',
      movie: { id: 'mov_paradise', title: 'Paradise' },
      theatre: { id: 'thr_sandhya', name: 'Sandhya 70mm' },
      seats: ['A1', 'A2', 'A3'],
      totalPrice: 450,
      paymentMethod: 'CARD',
    });
  });

  it('redirects to the dashboard and renders a fallback when checkout context is missing', (): void => {
    checkoutState.movie = null;

    render(<CheckoutPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Returning to dashboard…');
    expect(router.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('applies the preset, exposes only the chosen payment fields, and submits exactly once after 2000ms', async (): Promise<void> => {
    const view = render(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Seats' }));
    view.rerender(<CheckoutPage />);
    expect(screen.getByLabelText('A1, selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Card' }));
    view.rerender(<CheckoutPage />);
    expect(screen.getByLabelText('Card number')).toBeInTheDocument();
    expect(screen.queryByLabelText('UPI ID')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    view.rerender(<CheckoutPage />);
    expect(screen.getByLabelText('UPI ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Card number')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹450' }));
    expect(screen.getByText('Processing Payment...')).toBeVisible();
    await act(async (): Promise<void> => {
      vi.advanceTimersByTime(1999);
    });
    expect(mockedCreateBooking).not.toHaveBeenCalled();
    await act(async (): Promise<void> => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(mockedCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockedCreateBooking).toHaveBeenCalledWith('jwt-token', {
      movieId: 'mov_paradise',
      theatreId: 'thr_sandhya',
      seats: ['A1', 'A2', 'A3'],
      totalPrice: 450,
      paymentMethod: 'UPI',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Booking confirmed: bkg_test');
  });

  it('shows a booking error and restores payment controls when the booking request is rejected', async (): Promise<void> => {
    mockedCreateBooking.mockRejectedValue(new Error('Seats are no longer available.'));
    const view = render(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Seats' }));
    view.rerender(<CheckoutPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    view.rerender(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹450' }));

    await act(async (): Promise<void> => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Seats are no longer available.');
    expect(screen.getByRole('button', { name: 'Pay ₹450' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'UPI' })).toBeEnabled();
  });

  it('cancels the pending submission timer when checkout unmounts before 2000ms', async (): Promise<void> => {
    const view = render(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Seats' }));
    view.rerender(<CheckoutPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Card' }));
    view.rerender(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹450' }));

    view.unmount();
    await act(async (): Promise<void> => {
      vi.advanceTimersByTime(2000);
    });

    expect(checkoutState.cancel).toHaveBeenCalled();
    expect(mockedCreateBooking).not.toHaveBeenCalled();
  });
});
