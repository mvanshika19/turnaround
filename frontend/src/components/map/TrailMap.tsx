import 'maplibre-gl/dist/maplibre-gl.css';

import type { Feature, FeatureCollection, LineString } from 'geojson';
import { LngLatBounds, MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LngLatLike,
  StyleSpecification,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { SegmentStatus } from '@/api/types';
import { cn } from '@/lib/cn';
import { stretches, stretchStatus } from '@/lib/route';
import type { RoutePoint } from '@/lib/route';
import { SEGMENT_STATUSES } from '@/lib/status';
import { TONE_COLOR_VARIABLES } from '@/lib/tone';
import type { ResolvedTheme } from '@/theme/themeContext';

import type { MapPadding, TrailMapProps } from './types';

// MapLibre locates its worker next to its own module by default, which bundling breaks.
setWorkerUrl(workerUrl);

const STYLE_URLS: Record<ResolvedTheme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** Where the camera starts before a route is known: the North Shore mountains. */
const NORTH_SHORE: LngLatLike = [-123.07, 49.37];
const NORTH_SHORE_ZOOM = 10.5;
const FIT_MAX_ZOOM = 15;
const FIT_DURATION_MS = 900;

/** If the base map hasn't loaded by then (blocked or throttled host), draw on a plain background. */
const STYLE_TIMEOUT_MS = 8000;

const SOURCE_ID = 'trail';
const CASING_LAYER_ID = 'trail-casing';
const LINE_LAYER_ID = 'trail-line';

/** `pending` marks stretches whose conditions are not known yet (no plan loaded). */
interface SegmentProperties {
  status: SegmentStatus | 'pending';
}

type SegmentCollection = FeatureCollection<LineString, SegmentProperties>;

interface Markers {
  trailhead: Marker;
  top: Marker;
}

function toSegments(points: readonly RoutePoint[]): SegmentCollection {
  return {
    type: 'FeatureCollection',
    features: stretches(points).map(([from, to]): Feature<LineString, SegmentProperties> => ({
      type: 'Feature',
      properties: { status: stretchStatus(from, to) ?? 'pending' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.lon, from.lat],
          [to.lon, to.lat],
        ],
      },
    })),
  };
}

function cssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A local style with only the page background, used when the base map can't be fetched. */
function fallbackStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': cssToken('--bg') } },
    ],
  };
}

/** Line colours come from the design tokens of the theme currently on <html>. */
function addTrailLayers(map: MapLibreMap): void {
  const token = cssToken;
  const statusColor = (status: SegmentStatus) =>
    token(TONE_COLOR_VARIABLES[SEGMENT_STATUSES[status].tone]);

  const lineColor: ExpressionSpecification = [
    'match',
    ['get', 'status'],
    'daylight',
    statusColor('daylight'),
    'snow',
    statusColor('snow'),
    'dark',
    statusColor('dark'),
    token(TONE_COLOR_VARIABLES.neutral),
  ];

  map.addSource(SOURCE_ID, { type: 'geojson', data: toSegments([]) });
  map.addLayer({
    id: CASING_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': token('--map-casing'), 'line-width': 8 },
  });
  map.addLayer({
    id: LINE_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': lineColor, 'line-width': 5 },
  });
}

function drawRoute(map: MapLibreMap, points: readonly RoutePoint[]): void {
  void map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toSegments(points));
}

function createMarker(kind: 'trailhead' | 'top', text: string): Marker {
  const element = document.createElement('div');
  element.className = `map-marker map-marker--${kind}`;
  const dot = document.createElement('span');
  dot.className = 'map-marker__dot';
  const label = document.createElement('span');
  label.className = 'map-marker__label';
  label.textContent = text;
  element.append(dot, label);
  // Anchor the left edge, shifted by half the 14 px dot, so the dot sits on the coordinate.
  return new Marker({ element, anchor: 'left', offset: [-7, 0] });
}

function placeMarkers(map: MapLibreMap, markers: Markers, points: readonly RoutePoint[]): void {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) {
    markers.trailhead.remove();
    markers.top.remove();
    return;
  }
  for (const [marker, point] of [
    [markers.trailhead, first],
    [markers.top, last],
  ] as const) {
    marker.setLngLat([point.lon, point.lat]);
    if (!marker.getElement().isConnected) marker.addTo(map);
  }
}

function boundsOf(points: readonly RoutePoint[]): LngLatBounds {
  const bounds = new LngLatBounds();
  for (const point of points) bounds.extend([point.lon, point.lat]);
  return bounds;
}

function samePadding(a: MapPadding, b: MapPadding): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The route on an OpenFreeMap base map, coloured by conditions, with trailhead and top markers.
 * The map is created once per mount; theme changes swap the base style and redraw the route.
 */
export function TrailMap({
  points,
  routeKey,
  theme,
  padding,
  label,
  interactive = true,
  cooperativeGestures = false,
  className,
}: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Markers | null>(null);
  const styleThemeRef = useRef<ResolvedTheme | null>(null);
  const styleReadyRef = useRef(false);
  const fittedRef = useRef<{ routeKey: string; padding: MapPadding } | null>(null);
  /** True once the plain fallback style replaced a base map that failed to load. */
  const fallbackRef = useRef(false);
  const styleTimerRef = useRef<number | undefined>(undefined);
  const [baseMapFailed, setBaseMapFailed] = useState(false);

  const createMap = useEffectEvent((container: HTMLDivElement) => {
    styleThemeRef.current = theme;
    return new MapLibreMap({
      container,
      style: STYLE_URLS[theme],
      center: NORTH_SHORE,
      zoom: NORTH_SHORE_ZOOM,
      interactive,
      cooperativeGestures,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
  });

  // Every style load (first load and each theme swap) starts empty: add the layers, then the route.
  const handleStyleLoad = useEffectEvent((map: MapLibreMap) => {
    window.clearTimeout(styleTimerRef.current);
    if (!map.getSource(SOURCE_ID)) addTrailLayers(map);
    styleReadyRef.current = true;
    if (!fallbackRef.current) setBaseMapFailed(false);
    drawRoute(map, points);
  });

  /** The base map failed or stalled: keep the route visible on a plain background instead. */
  const showFallback = useEffectEvent((map: MapLibreMap) => {
    if (styleReadyRef.current || fallbackRef.current) return;
    window.clearTimeout(styleTimerRef.current);
    fallbackRef.current = true;
    setBaseMapFailed(true);
    map.setStyle(fallbackStyle(), { diff: false });
  });

  const watchStyleLoad = useEffectEvent((map: MapLibreMap) => {
    window.clearTimeout(styleTimerRef.current);
    styleTimerRef.current = window.setTimeout(() => {
      showFallback(map);
    }, STYLE_TIMEOUT_MS);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = createMap(container);
    map.touchZoomRotate.disableRotation();
    map.on('style.load', () => {
      handleStyleLoad(map);
    });
    // Errors before the style is ready mean the base map itself (style, sprite or glyphs) failed;
    // tile errors after that are left to MapLibre, which retries them.
    map.on('error', () => {
      showFallback(map);
    });
    watchStyleLoad(map);
    const markers = {
      trailhead: createMarker('trailhead', 'Trailhead'),
      top: createMarker('top', 'Top'),
    };
    mapRef.current = map;
    markersRef.current = markers;

    return () => {
      window.clearTimeout(styleTimerRef.current);
      markers.trailhead.remove();
      markers.top.remove();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      styleThemeRef.current = null;
      styleReadyRef.current = false;
      fittedRef.current = null;
      fallbackRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handler = mapRef.current?.cooperativeGestures;
    if (!handler || handler.isEnabled() === cooperativeGestures) return;
    if (cooperativeGestures) handler.enable();
    else handler.disable();
  }, [cooperativeGestures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleThemeRef.current === theme) return;
    styleThemeRef.current = theme;
    styleReadyRef.current = false;
    fallbackRef.current = false;
    map.setStyle(STYLE_URLS[theme], { diff: false });
    watchStyleLoad(map);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;
    if (styleReadyRef.current) drawRoute(map, points);
    placeMarkers(map, markers, points);
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || routeKey === undefined || points.length < 2) return;
    const fitted = fittedRef.current;
    if (fitted?.routeKey === routeKey && samePadding(fitted.padding, padding)) return;
    map.fitBounds(boundsOf(points), {
      padding,
      maxZoom: FIT_MAX_ZOOM,
      duration: FIT_DURATION_MS,
      animate: fitted !== null && !prefersReducedMotion(),
    });
    fittedRef.current = { routeKey, padding };
  }, [routeKey, points, padding]);

  return (
    <div
      role={interactive ? 'region' : 'figure'}
      aria-label={label}
      className={cn('trail-map relative overflow-hidden bg-fill', className)}
    >
      {/* Sized by width and height, not insets: maplibre-gl.css makes this element `relative`. */}
      <div ref={containerRef} className="size-full" />
      {baseMapFailed && (
        <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-material px-2.5 py-1 text-caption text-label-secondary shadow-panel">
          Base map unavailable
        </p>
      )}
    </div>
  );
}
