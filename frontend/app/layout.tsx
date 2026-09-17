import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Playfair_Display, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });
const text = Source_Sans_3({ subsets: ['latin'], variable: '--font-text' });

export const metadata: Metadata = {
  title: 'BookMyShow Replica',
  description: 'A cinema-first authentication flow for BookMyShow Replica.',
};

/** Supply global typography, styling, and in-memory authentication context. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
