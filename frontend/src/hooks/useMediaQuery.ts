import { useCallback, useSyncExternalStore } from 'react';

/** Whether a CSS media query currently matches, updated live. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** Matches Tailwind's `lg` breakpoint, where the planner switches to floating panels. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
