import { MapPinOff } from 'lucide-react';
import { Component } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface MapErrorBoundaryProps {
  className?: string;
  children: ReactNode;
}

interface MapErrorBoundaryState {
  failed: boolean;
}

/**
 * Keeps the page usable when the map can't start (no WebGL, or its code failed to download):
 * the plan still works, and the map area says why it is empty.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  override state: MapErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="img"
        aria-label="The map couldn’t load"
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-fill p-4 text-center',
          this.props.className,
        )}
      >
        <MapPinOff aria-hidden className="size-5 text-label" />
        <p className="text-footnote text-label">The map couldn’t load on this device.</p>
      </div>
    );
  }
}
