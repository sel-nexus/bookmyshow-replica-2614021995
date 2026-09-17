import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AuthService } from '../services/authService';

const mobileSchema = z.string().trim().regex(/^\d{10,15}$/, 'mobile must be 10 to 15 digits');
const loginSchema = z.object({ mobile: mobileSchema }).strict();
const verifySchema = z.object({ mobile: mobileSchema, otp: z.string().regex(/^\d{4}$/, 'otp must contain exactly 4 digits') }).strict();

/** Create HTTP routes for requesting and verifying a mobile OTP. */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  router.post('/login', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const input = loginSchema.parse(request.body);
      response.status(200).json({ data: authService.requestLogin(input.mobile) });
    } catch (error: unknown) {
      next(error);
    }
  });
  router.post('/verify', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const input = verifySchema.parse(request.body);
      response.status(200).json({ data: authService.verifyOtp(input.mobile, input.otp) });
    } catch (error: unknown) {
      next(error);
    }
  });
  return router;
}
