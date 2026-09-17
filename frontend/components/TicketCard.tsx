import React, { type ReactElement } from 'react';
import type { BookingConfirmation } from '../lib/api';

interface TicketCardProps {
  ticket: BookingConfirmation;
}

/** Present only the authoritative fields supplied by a completed booking. */
export function TicketCard({ ticket }: TicketCardProps): ReactElement {
  return <article aria-labelledby="ticket-title">
    <p className="eyebrow">BOOKING CONFIRMED</p>
    <h1 id="ticket-title">Your ticket</h1>
    <dl>
      <div><dt>Confirmation ID</dt><dd>{ticket.confirmationId}</dd></div>
      <div><dt>Movie</dt><dd>{ticket.movie.title}</dd></div>
      <div><dt>Theatre</dt><dd>{ticket.theatre.name}</dd></div>
      <div><dt>Seats</dt><dd>{ticket.seats.join(', ')}</dd></div>
      <div><dt>Total</dt><dd>₹{ticket.totalPrice}</dd></div>
      <div><dt>Payment method</dt><dd>{ticket.paymentMethod}</dd></div>
    </dl>
  </article>;
}
