import React, { type ReactElement } from 'react';

/** Render the fixed checkout seat preset as a noninteractive cinema seating grid. */
export function SeatGrid({ seats }: { seats: string[] }): ReactElement {
  const labels = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  return <section aria-labelledby="seat-grid-title"><h2 id="seat-grid-title">Your seats</h2><div className="seat-grid" aria-label="Static seat grid">{labels.map((seat) => <span className={seats.includes(seat) ? 'seat selected-seat' : 'seat'} key={seat} aria-label={`${seat}${seats.includes(seat) ? ', selected' : ', unavailable'}`}>{seat}</span>)}</div></section>;
}
