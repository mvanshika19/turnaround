import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { ThemeContext } from './themeContext';
import type { ResolvedTheme, ThemePreference } from './themeContext';

/** Keep in sync with the inline script in index.html, which applies the theme before first paint. */
const STORAGE_KEY = 'turnaround.theme';
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isPreference(value: string | null): value is ThemePreference {
  return PREFERENCES.some((preference) => preference === value);
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function storePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage is blocked (private mode, disabled cookies): the choice lasts for this visit only.
  }
}

function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Tint the browser chrome with the page background of the theme actually on screen.
  const background = getComputedStyle(root).getPropertyValue('--bg').trim();
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = background;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;

  // A layout effect, so the theme is on <html> before children's effects read the tokens.
  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    storePreference(next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
