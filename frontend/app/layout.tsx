import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Playfair_Display, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ThemeProvider } from '../lib/theme-context';
import { THEME_BOOTSTRAP } from '../lib/theme';

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });
const text = Source_Sans_3({ subsets: ['latin'], variable: '--font-text' });

export const metadata: Metadata = {
  title: 'BookMyShow Replica',
  description: 'A cinema-first authentication flow for BookMyShow Replica.',
};

/** Supply global typography, styling, and in-memory authentication context. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${display.variable} ${text.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
