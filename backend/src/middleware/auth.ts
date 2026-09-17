import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { config } from '../config';

/** Require a valid application JWT for future protected routes. */
export const requireAuth: RequestHandler = (request, response, next): void => {
  const token = request.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.', requestId: response.locals.requestId } });
    return;
  }
  try {
    jwt.verify(token, config.jwtSecret, { issuer: config.jwtIssuer });
    next();
  } catch {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.', requestId: response.locals.requestId } });
  }
}
