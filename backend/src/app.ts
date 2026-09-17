import cors from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { config } from './config';
import { createDatabase } from './db/database';
import { seedCatalog } from './db/seed';
import { errorHandler } from './middleware/error';
import { requestContext } from './middleware/requestContext';
import { SqliteUserRepository } from './repositories/sqliteRepository';
import { createAuthRouter } from './routers/authRouter';
import { createCatalogRouter } from './routers/catalogRouter';
import { createBookingRouter } from './routers/bookingRouter';
import { AuthService } from './services/authService';
import { BookingService } from './services/bookingService';
import { CatalogService } from './services/catalogService';

/** Assemble the HTTP API around a migrated SQLite connection. */
export function createApp(connection?: Database.Database): Application {
  const app = express();
  const activeConnection = connection ?? createDatabase();
  seedCatalog(activeConnection);
  const repository = new SqliteUserRepository(activeConnection);
  const authService = new AuthService(repository);
  const catalogService = new CatalogService(repository);
  const bookingService = new BookingService(repository);
  app.use(cors({ origin: config.corsOrigin }));
  app.use(requestContext);
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_request: Request, response: Response): void => {
    response.status(200).json({ data: { status: 'ok' } });
  });
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api', createCatalogRouter(catalogService));
  app.use('/api', createBookingRouter(bookingService));
  app.use(errorHandler);
  return app;
}
