import type { BookingRecord, SqliteUserRepository } from '../repositories/sqliteRepository';

/** Carry an expected booking-context conflict to the HTTP error mapper. */
export class BookingContextError extends Error {
  /** Initialize the booking-context conflict with its stable error code. */
  public constructor() {
    super('The booking context no longer matches the available show.');
  }
}

/** Create authoritative bookings from validated checkout choices. */
export class BookingService {
  /** Initialize booking writes with the shared SQLite repository. */
  public constructor(private readonly repository: SqliteUserRepository) {}

  /** Reject altered preset details and persist an approved booking for the authenticated user. */
  public createBooking(userId: string, input: { movieId: string; theatreId: string; seats: string[]; totalPrice: number; paymentMethod: 'CARD' | 'UPI' }): BookingRecord {
    const approvedSeats = ['A1', 'A2', 'A3'];
    const approvedPrice = 450;
    if (input.seats.length !== approvedSeats.length || input.seats.some((seat, index) => seat !== approvedSeats[index]) || input.totalPrice !== approvedPrice) {
      throw new BookingContextError();
    }
    const booking = this.repository.createBooking(userId, input.movieId, input.theatreId, approvedSeats, approvedPrice, input.paymentMethod);
    if (!booking) throw new BookingContextError();
    return booking;
  }
}
