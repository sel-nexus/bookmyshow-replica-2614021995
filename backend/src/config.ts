import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().min(1).default('./data/bookmyshow.db'),
  JWT_SECRET: z.string().min(16).default('dev-secret-change-in-production'),
  JWT_ISSUER: z.string().min(1).default('bookmyshow-replica'),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
});

const values = environmentSchema.parse(process.env);

/** Provide validated configuration for application startup. */
export const config = {
  port: values.PORT,
  databasePath: path.resolve(values.DATABASE_PATH),
  jwtSecret: values.JWT_SECRET,
  jwtIssuer: values.JWT_ISSUER,
  corsOrigin: values.CORS_ORIGIN,
};
