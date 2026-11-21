import { useCallback, useState } from 'react';
import type { RefCallback } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/** Tracks an element's content-box size. Attach the returned ref callback to the element. */
export function useElementSize<T extends HTMLElement>(): [RefCallback<T>, ElementSize | null] {
  const [size, setSize] = useState<ElementSize | null>(null);

  const ref = useCallback((element: T | null) => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        previous?.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, size];
}
