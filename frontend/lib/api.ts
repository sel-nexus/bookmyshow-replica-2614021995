export interface AuthUser {
  id: string;
  mobile: string;
  createdAt: string;
}

/** Describe a movie available for theatre selection. */
export interface Movie {
  id: string;
  title: string;
}

/** Describe a theatre mapped to a selected movie. */
export interface Theatre {
  id: string;
  name: string;
}

interface ApiErrorEnvelope {
  error: { code: string; message: string; requestId?: string };
}

interface ApiDataEnvelope<T> {
  data: T;
}

/** Describe a user-visible failure returned by the API. */
export class ApiError extends Error {
  /** Initialize an error with its stable machine-readable code. */
  public constructor(public readonly code: string, message: string) {
    super(message);
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Generate a request correlation ID without relying on a polyfill. */
function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Submit a typed JSON request and unwrap the standard API envelope. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'X-Request-Id': createRequestId(), ...init?.headers },
  });
  const body = (await response.json()) as ApiDataEnvelope<T> | ApiErrorEnvelope;
  if (!response.ok || 'error' in body) {
    const error = 'error' in body ? body.error : { code: 'REQUEST_FAILED', message: 'Unable to complete the request.' };
    throw new ApiError(error.code, error.message);
  }
  return body.data;
}

/** Submit a typed JSON request and unwrap the standard API envelope. */
async function post<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

/** Fetch a typed API response and unwrap the standard data envelope. */
async function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

/** Request the demo OTP acknowledgement for a valid mobile number. */
export function requestLogin(mobile: string): Promise<{ mobile: string; nextStep: 'VERIFY_OTP'; message: string }> {
  return post('/api/auth/login', { mobile });
}

/** Verify an OTP and receive a persisted user plus bearer token. */
export function verifyOtp(mobile: string, otp: string): Promise<{ user: AuthUser; token: string }> {
  return post('/api/auth/verify', { mobile, otp });
}

/** Fetch the movies available in the seeded catalog. */
export function getMovies(): Promise<{ movies: Movie[] }> {
  return get('/api/movies');
}

/** Fetch theatres that screen the requested movie. */
export function getTheatres(movieId: string): Promise<{ theatres: Theatre[] }> {
  return get(`/api/theatres?movieId=${encodeURIComponent(movieId)}`);
}

/** Describe the authoritative ticket returned after a successful booking. */
export interface BookingConfirmation {
  confirmationId: string;
  movie: Movie;
  theatre: Theatre;
  seats: string[];
  totalPrice: number;
  paymentMethod: 'CARD' | 'UPI';
}

/** Submit an authorized booking without transmitting payment-instrument details. */
export function createBooking(token: string, input: { movieId: string; theatreId: string; seats: string[]; totalPrice: number; paymentMethod: 'CARD' | 'UPI' }): Promise<BookingConfirmation> {
  return request('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
}
