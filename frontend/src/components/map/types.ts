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
  className?: string;
}
