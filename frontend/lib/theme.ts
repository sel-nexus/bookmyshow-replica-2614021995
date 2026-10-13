/** Manage validated, best-effort browser appearance preferences without OS following. */
export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'bookmyshow-theme';

/** Accept only the two supported appearance values. */
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Read a preference, returning Light if storage access or its getter fails. */
export function readTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : 'light';
  } catch {
    return 'light';
  }
}

/** Persist a choice when allowed; never interrupt a session on storage failure. */
export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Privacy settings and quota failures must not prevent session selection.
  }
}

/** Restore a validated preference before paint, without interpolating stored content. */
export const THEME_BOOTSTRAP = `(()=>{let theme='light';try{const value=window.localStorage.getItem('${THEME_STORAGE_KEY}');if(value==='light'||value==='dark')theme=value;}catch{}document.documentElement.dataset.theme=theme;})();`;
