import { use } from 'react';

import { ThemeContext } from './themeContext';
import type { ThemeContextValue } from './themeContext';

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return value;
}
