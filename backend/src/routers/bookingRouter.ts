import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { BookingContextError, type BookingService } from '../services/bookingService';

const bookingSchema = z.object({
  movieId: z.string().trim().min(1, 'movieId is required.'),
  theatreId: z.string().trim().min(1, 'theatreId is required.'),
  seats: z.array(z.string().regex(/^[A-Z]\d+$/, 'Each seat must use the row-number format.')).min(1),
  totalPrice: z.number().int().positive(),
  paymentMethod: z.enum(['CARD', 'UPI']),
}).strict();

/** Create protected HTTP routes for committing checkout bookings. */
export function createBookingRouter(bookingService: BookingService): Router {
  const router = Router();
  router.post('/bookings', requireAuth, (request: Request, response: Response, next: NextFunction): void => {
    try {
      const input = bookingSchema.parse(request.body);
      const userId = response.locals.authUserId as string | undefined;
      if (!userId) {
        response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required.', requestId: response.locals.requestId } });
        return;
      }
      response.status(201).json({ data: bookingService.createBooking(userId, input) });
    } catch (error: unknown) {
      if (error instanceof BookingContextError) {
        response.status(409).json({ error: { code: 'INVALID_BOOKING_CONTEXT', message: error.message, requestId: response.locals.requestId } });
        return;
      }
      next(error);
    }
  });
  return router;
}
