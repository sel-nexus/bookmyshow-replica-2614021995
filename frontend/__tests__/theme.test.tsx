/** Verify appearance validation, storage resilience, hydration, and stable child identity. */
import React, { useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { ThemeProvider } from '../lib/theme-context';
import { ThemeToggle } from '../components/ThemeToggle';
import { AppShell } from '../components/AppShell';
import { isTheme, readTheme, saveTheme, THEME_BOOTSTRAP, THEME_STORAGE_KEY } from '../lib/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

/** Render an editable child whose uncontrolled input and local state must survive. */
function Task(): React.ReactElement {
  const [count, setCount] = useState(0);
  return (
    <>
      <label>Unsaved task<input defaultValue="" /></label>
      <button onClick={() => setCount(count + 1)}>Task count {count}</button>
    </>
  );
}

/** Execute the exact inline bootstrap against controlled browser capabilities. */
function bootstrap(storage: object): string | undefined {
  const root: { dataset: { theme?: string } } = { dataset: {} };
  new Function('window', 'document', THEME_BOOTSTRAP)(storage, { documentElement: root });
  return root.dataset.theme;
}

describe('preference helpers', () => {
  it.each(['light', 'dark'])('accepts supported %s and round-trips storage', (value) => {
    expect(isTheme(value)).toBe(true);
    saveTheme(value as 'light' | 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(value);
    expect(readTheme()).toBe(value);
  });

  it.each([null, undefined, '', 'Dark', 'system', ' dark ', '"dark"', '<script>', 1, {}, true])(
    'rejects unsupported preference %j', (value) => {
      expect(isTheme(value)).toBe(false);
    },
  );

  it.each([null, '', 'Dark', 'system', ' dark ', '<script>'])('reads %j as Light', (value) => {
    if (value !== null) localStorage.setItem(THEME_STORAGE_KEY, value);
    expect(readTheme()).toBe('light');
  });

  it('defaults to Light even when OS preference is Dark', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    expect(readTheme()).toBe('light');
    vi.unstubAllGlobals();
  });

  it('defaults safely when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(readTheme()).toBe('light');
  });

  it('handles a blocked localStorage getter for both reads and writes', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
    expect(readTheme()).toBe('light');
    expect(() => saveTheme('dark')).not.toThrow();
  });

  it('does not throw or overwrite storage when setItem fails', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => saveTheme('dark')).not.toThrow();
    expect(readTheme()).toBe('light');
  });
});

describe('pre-paint bootstrap', () => {
  it.each(['light', 'dark', null, 'Dark', 'system', '<script>'])('validates %j before applying', (value) => {
    const getItem = vi.fn(() => value);
    expect(bootstrap({ localStorage: { getItem } })).toBe(value === 'dark' ? 'dark' : 'light');
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });

  it('sets Light when storage reads throw', () => {
    expect(bootstrap({ localStorage: { getItem: () => { throw new Error('read'); } } })).toBe('light');
  });

  it('sets Light when obtaining localStorage throws', () => {
    const browser = Object.defineProperty({}, 'localStorage', {
      get: () => { throw new Error('getter'); },
    });
    expect(bootstrap(browser)).toBe('light');
  });
});

describe('provider and native appearance selector', () => {
  it('exposes a named Light selection with both options in the shared shell', () => {
    render(<ThemeProvider><AppShell><Task /></AppShell></ThemeProvider>);
    expect(screen.getByRole('combobox', { name: 'Appearance' })).toHaveValue('light');
    expect(screen.getByRole('option', { name: 'Light' })).toHaveProperty('selected', true);
    expect(screen.getByRole('option', { name: 'Dark' })).toBeInTheDocument();
  });

  it('restores saved Dark and exposes the selected option', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('option', { name: 'Dark' })).toHaveProperty('selected', true);
  });

  it('hydrates saved Dark without mismatch errors or losing existing children', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const ui = <ThemeProvider><ThemeToggle /><Task /></ThemeProvider>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);
    const input = container.querySelector('input')!;
    input.value = 'typed before hydration';
    new Function(THEME_BOOTSTRAP)();
    expect(document.documentElement.dataset.theme).toBe('dark');
    const errors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error');
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, ui, { onRecoverableError: (error) => errors.push(error) }); });
    expect(screen.getByRole('combobox')).toHaveValue('dark');
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('typed before hydration');
    expect(errors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    await act(async () => root!.unmount());
    container.remove();
  });

  it.each(['system', 'Dark', ''])('falls back from invalid saved %j and permits selection', async (value) => {
    localStorage.setItem(THEME_STORAGE_KEY, value);
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    expect(screen.getByRole('combobox')).toHaveValue('light');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'dark');
    expect(readTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it.each(['getter', 'read', 'write'])('allows session switching with a blocked storage %s', async (failure) => {
    if (failure === 'getter') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('getter'); });
    } else {
      vi.spyOn(Storage.prototype, failure === 'read' ? 'getItem' : 'setItem')
        .mockImplementation(() => { throw new Error('denied'); });
    }
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'dark');
    expect(screen.getByRole('combobox')).toHaveValue('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('supports tab focus and native option selection without submitting a form', async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<ThemeProvider><form onSubmit={submit}><ThemeToggle /></form></ThemeProvider>);
    await userEvent.tab();
    const selector = screen.getByRole('combobox', { name: 'Appearance' });
    expect(selector).toHaveFocus();
    await userEvent.selectOptions(selector, 'dark');
    expect(screen.getByRole('option', { name: 'Dark' })).toHaveProperty('selected', true);
    expect(submit).not.toHaveBeenCalled();
  });

  it('synchronizes shared selectors and preserves input identity and child state in both modes', async () => {
    render(<ThemeProvider><ThemeToggle /><ThemeToggle /><Task /></ThemeProvider>);
    const input = screen.getByRole('textbox', { name: 'Unsaved task' });
    await userEvent.type(input, 'keep my booking');
    await userEvent.click(screen.getByRole('button', { name: 'Task count 0' }));
    for (const theme of ['dark', 'light']) {
      await userEvent.selectOptions(screen.getAllByRole('combobox')[0], theme);
      expect(screen.getAllByRole('combobox')[1]).toHaveValue(theme);
      expect(screen.getByRole('textbox')).toBe(input);
      expect(input).toHaveValue('keep my booking');
      expect(screen.getByRole('button', { name: 'Task count 1' })).toBeInTheDocument();
    }
  });
});
