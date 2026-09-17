export interface AuthUser {
  id: string;
  mobile: string;
  createdAt: string;
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
async function post<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': createRequestId() },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as ApiDataEnvelope<T> | ApiErrorEnvelope;
  if (!response.ok || 'error' in body) {
    const error = 'error' in body ? body.error : { code: 'REQUEST_FAILED', message: 'Unable to complete the request.' };
    throw new ApiError(error.code, error.message);
  }
  return body.data;
}

/** Request the demo OTP acknowledgement for a valid mobile number. */
export function requestLogin(mobile: string): Promise<{ mobile: string; nextStep: 'VERIFY_OTP'; message: string }> {
  return post('/api/auth/login', { mobile });
}

/** Verify an OTP and receive a persisted user plus bearer token. */
export function verifyOtp(mobile: string, otp: string): Promise<{ user: AuthUser; token: string }> {
  return post('/api/auth/verify', { mobile, otp });
}
