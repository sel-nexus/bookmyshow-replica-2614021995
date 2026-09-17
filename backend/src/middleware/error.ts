import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AuthError } from '../services/authService';

/** Format controlled and unexpected failures using the stable error envelope. */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next): void => {
  const requestId = response.locals.requestId as string | undefined;
  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid request.', requestId, details: error.issues.map((issue) => ({ field: issue.path.join('.'), rule: issue.code })) } });
    return;
  }
  if (error instanceof AuthError) {
    response.status(401).json({ error: { code: error.code, message: error.message, requestId } });
    return;
  }
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId } });
};
