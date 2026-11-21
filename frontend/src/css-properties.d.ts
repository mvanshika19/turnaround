import 'react';

declare module 'react' {
  /** Allows typed CSS custom properties in `style`, e.g. `{ '--range-progress': '40%' }`. */
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- an augmentation must be an interface to merge with React's own CSSProperties.
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
