import React, { type ReactElement } from 'react';
import type { Theatre } from '../lib/api';

interface TheatreSelectorProps {
  theatres: Theatre[];
  selectedTheatreId: string | null;
  onSelect: (theatre: Theatre) => void;
}

/** Render accessible theatre selection controls for the chosen movie. */
export function TheatreSelector({ theatres, selectedTheatreId, onSelect }: TheatreSelectorProps): ReactElement {
  return (
    <section aria-labelledby="theatres-heading">
      <h2 id="theatres-heading">Choose a theatre</h2>
      <div role="list" aria-label="Theatres">
        {theatres.map((theatre) => (
          <button
            key={theatre.id}
            type="button"
            aria-pressed={selectedTheatreId === theatre.id}
            onClick={() => onSelect(theatre)}
          >
            {theatre.name}
          </button>
        ))}
      </div>
    </section>
  );
}
