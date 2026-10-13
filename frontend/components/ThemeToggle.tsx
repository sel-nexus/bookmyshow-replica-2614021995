'use client';

/** Expose the shared appearance using native keyboard and selection semantics. */
import React, { useId } from 'react';
import type { ReactElement } from 'react';
import { useTheme } from '../lib/theme-context';
import { isTheme } from '../lib/theme';

/** Render a named native selector with its current Light or Dark option. */
export function ThemeToggle(): ReactElement {
  const id = useId();
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-control">
      <label htmlFor={id}>Appearance</label>
      <select
        id={id}
        value={theme}
        onChange={(event) => {
          if (isTheme(event.target.value)) setTheme(event.target.value);
        }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
