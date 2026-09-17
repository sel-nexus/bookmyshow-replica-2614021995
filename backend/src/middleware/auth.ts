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
    const claims = jwt.verify(token, config.jwtSecret, { issuer: config.jwtIssuer });
    if (typeof claims === 'string' || typeof claims.sub !== 'string') throw new Error('JWT subject is missing.');
    response.locals.authUserId = claims.sub;
    next();
  } catch {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.', requestId: response.locals.requestId } });
  }
}
