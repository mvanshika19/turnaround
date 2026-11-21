import { lazy, Suspense } from 'react';

import { cn } from '@/lib/cn';

import { MapErrorBoundary } from './MapErrorBoundary';
import type { TrailMapProps } from './types';

// MapLibre is large, so the map loads in its own chunk while the rest of the page renders.
const TrailMap = lazy(() => import('./TrailMap').then((module) => ({ default: module.TrailMap })));

export function LazyTrailMap(props: TrailMapProps) {
  return (
    <MapErrorBoundary className={props.className}>
      <Suspense fallback={<div aria-hidden className={cn('bg-fill', props.className)} />}>
        <TrailMap {...props} />
      </Suspense>
    </MapErrorBoundary>
  );
}
