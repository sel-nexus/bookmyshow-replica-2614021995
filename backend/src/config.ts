import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().min(1).default('./data/bookmyshow.db'),
  JWT_SECRET: z.string().min(16).default('dev-secret-change-in-production'),
  JWT_ISSUER: z.string().min(1).default('bookmyshow-replica'),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
});

const values = environmentSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_PATH: process.env.DATABASE_PATH,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ISSUER: process.env.JWT_ISSUER,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

/** Provide validated configuration for application startup. */
export const config = {
  port: values.PORT,
  databasePath: path.resolve(values.DATABASE_PATH),
  jwtSecret: values.JWT_SECRET,
  jwtIssuer: values.JWT_ISSUER,
  corsOrigin: values.CORS_ORIGIN,
};
