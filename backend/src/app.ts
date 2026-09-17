import cors from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { config } from './config';
import { createDatabase } from './db/database';
import { errorHandler } from './middleware/error';
import { requestContext } from './middleware/requestContext';
import { SqliteUserRepository } from './repositories/sqliteRepository';
import { createAuthRouter } from './routers/authRouter';
import { AuthService } from './services/authService';

/** Assemble the HTTP API around a migrated SQLite connection. */
export function createApp(connection?: Database.Database): Application {
  const app = express();
  const activeConnection = connection ?? createDatabase();
  const authService = new AuthService(new SqliteUserRepository(activeConnection));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(requestContext);
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_request: Request, response: Response): void => {
    response.status(200).json({ data: { status: 'ok' } });
  });
  app.use('/api/auth', createAuthRouter(authService));
  app.use(errorHandler);
  return app;
}
