import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../app/(flow)/dashboard/page';
import { getMovies, getTheatres } from '../lib/api';

vi.mock('../lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/api')>()), getMovies: vi.fn(), getTheatres: vi.fn() }));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn(() => ({ user: { id: 'user-1', mobile: '9876543210', createdAt: '2026-01-01T00:00:00.000Z' } })) }));
vi.mock('../components/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const mockedGetMovies = vi.mocked(getMovies);
const mockedGetTheatres = vi.mocked(getTheatres);

/** Verify that the dashboard renders catalog states and persists selections in context. */
describe('catalog dashboard', () => {
  /** Restore deterministic catalog responses before every UI test. */
  beforeEach((): void => { vi.clearAllMocks(); });

  /** Load movies, select one, then load and select its theatre. */
  it('renders loaded catalog choices and records a movie-theatre selection', async (): Promise<void> => {
    const user = userEvent.setup();
    mockedGetMovies.mockResolvedValue({ movies: [{ id: 'mov_paradise', title: 'Paradise' }] });
    mockedGetTheatres.mockResolvedValue({ theatres: [{ id: 'thr_sandhya', name: 'Sandhya 70mm' }] });
    render(<DashboardPage />);
    await user.click(await screen.findByRole('button', { name: 'Paradise' }));
    await user.click(await screen.findByRole('button', { name: 'Sandhya 70mm' }));
    expect(screen.getByRole('status')).toHaveTextContent('Selected: Paradise at Sandhya 70mm.');
  });

  /** Render fetch-derived movie errors and theatre empty results. */
  it('renders error and empty states returned by catalog fetches', async (): Promise<void> => {
    const user = userEvent.setup();
    mockedGetMovies.mockResolvedValueOnce({ movies: [{ id: 'mov_og2', title: 'OG2' }] }).mockRejectedValueOnce(new Error('Movie service unavailable'));
    mockedGetTheatres.mockResolvedValue({ theatres: [] });
    const firstRender = render(<DashboardPage />);
    await user.click(await screen.findByRole('button', { name: 'OG2' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No theatres are available for this movie.');
    firstRender.unmount();
    render(<DashboardPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Movie service unavailable');
  });
});
