'use client';

/** Keep appearance state above routes without replacing application children. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { readTheme, saveTheme } from './theme';
import type { Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setTheme: () => {} });

/** Hydrate with the server's Light selection, then restore preference without remounting. */
export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [theme, updateTheme] = useState<Theme>('light');
  useEffect(() => {
    const restored = readTheme();
    document.documentElement.dataset.theme = restored;
    updateTheme(restored);
  }, []);

  /** Apply session appearance immediately, even if persistence is denied. */
  const setTheme = useCallback((nextTheme: Theme): void => {
    document.documentElement.dataset.theme = nextTheme;
    updateTheme(nextTheme);
    saveTheme(nextTheme);
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Read the shared appearance; isolated server/component previews default to Light. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
