import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';

/** Frame public pages with concise cinema-inspired navigation and a footer. */
export function AppShell({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/">
          BOOK<span>MY</span>SHOW
        </Link>
        <span className="header-note">Your next seat is waiting.</span>
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <footer>Made for the big screen — and the moments before it.</footer>
    </div>
  );
}
