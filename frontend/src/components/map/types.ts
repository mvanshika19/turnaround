import type { ReactNode } from 'react';

import type { RoutePoint } from '@/lib/route';
import type { ResolvedTheme } from '@/theme/themeContext';

/** Space in pixels kept clear around the route, e.g. for panels floating over the map. */
export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TrailMapProps {
  points: readonly RoutePoint[];
  /** Identifies the route. The camera fits the route when this changes, not on every update. */
  routeKey: string | undefined;
  theme: ResolvedTheme;
  padding: MapPadding;
  /** Accessible name of the map, e.g. "Map of Lynn Peak". */
  label: string;
  /** Set to false for a static preview: no panning, zooming or keyboard focus. */
  interactive?: boolean;
  /**
   * Pan with two fingers and zoom with Ctrl/Cmd + scroll, so a map inside a scrolling page
   * doesn't trap the scroll gesture.
   */
  cooperativeGestures?: boolean;
  /** Index into `points` of the point being inspected, drawn as a dot on the route. */
  activeIndex?: number | null;
  /** Makes the route clickable: called with the nearest point's index, or null for a miss. */
  onPointSelect?: (index: number | null) => void;
  /** Shown in a popup at the active point (when set); the popup's close button calls `onPopupClose`. */
  popup?: ReactNode;
  onPopupClose?: () => void;
  className?: string;
}
