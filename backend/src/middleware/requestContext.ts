import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Attach and echo a correlation identifier for each HTTP request. */
export const requestContext: RequestHandler = (request, response, next): void => {
  const candidate = request.header('X-Request-Id');
  const requestId = candidate && candidate.length <= 128 ? candidate : randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  next();
};
