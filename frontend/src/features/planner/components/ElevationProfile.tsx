import { useEffect, useEffectEvent } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import type { PlanPoint } from '@/api/types';
import { useElementSize } from '@/hooks/useElementSize';
import { cn } from '@/lib/cn';
import { formatKm, formatMeters } from '@/lib/format';
import { stretches, stretchStatus } from '@/lib/route';
import type { RoutePoint } from '@/lib/route';
import { SEGMENT_STATUSES } from '@/lib/status';
import { TONE_STROKE_CLASSES } from '@/lib/tone';

import { describePoint } from './describePoint';
import { PointDetails } from './PointDetails';

interface ElevationProfileProps {
  /** The outbound route, trailhead first. */
  points: readonly RoutePoint[];
  snowLineM: number | null;
  /** Times and conditions for each point, once a plan for this route is loaded. Enables inspection. */
  details: readonly PlanPoint[] | undefined;
  /** The inspected point, shared with the map. */
  activeIndex: number | null;
  /** Show the details card here (false when the map's popup shows the same point). */
  showCard: boolean;
  onActiveIndexChange: (index: number | null) => void;
  className?: string;
}

/** Room under the plot for the caption-size axis labels (16 px line plus a 4 px gap). */
const AXIS_HEIGHT = 20;
/** Keeps the 2.5 px line and its round caps inside the drawing. */
const INSET = 2;
const LINE_WIDTH = 2.5;
/** Fraction of the elevation range added above and below the profile. */
const RANGE_PADDING = 0.1;
/** Minimum vertical span, so a nearly flat trail doesn't look like a cliff. */
const MIN_RANGE_M = 20;
/** Width of the details card, and its gap from the guide line. */
const CARD_WIDTH = 272;
const CARD_GAP = 12;

interface Range {
  floor: number;
  ceiling: number;
}

function elevationRange(points: readonly RoutePoint[]): Range {
  const elevations = points.map((point) => point.ele_m);
  const lowest = Math.min(...elevations);
  const highest = Math.max(...elevations);
  const span = Math.max(highest - lowest, MIN_RANGE_M);
  return { floor: lowest - span * RANGE_PADDING, ceiling: highest + span * RANGE_PADDING };
}

function isSnowLineShown(snowLineM: number | null, { floor, ceiling }: Range): boolean {
  return snowLineM !== null && snowLineM > floor && snowLineM < ceiling;
}

function describeProfile(points: readonly RoutePoint[], snowLineM: number | null): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return 'Elevation profile';
  const snow =
    isSnowLineShown(snowLineM, elevationRange(points)) && snowLineM !== null
      ? ` Snow likely above ${formatMeters(snowLineM)}.`
      : '';
  return `Elevation profile: ${formatMeters(first.ele_m)} at the trailhead, ${formatMeters(last.ele_m)} at the top, over ${formatKm(last.km - first.km)}.${snow}`;
}

/** Horizontal position of a distance along the route, within a chart `width` pixels wide. */
function xForKm(points: readonly RoutePoint[], width: number, km: number): number {
  const first = points[0]?.km ?? 0;
  const distance = (points.at(-1)?.km ?? 0) - first;
  return INSET + (distance > 0 ? ((km - first) / distance) * (width - 2 * INSET) : 0);
}

/** The point whose distance is nearest to horizontal position `x`. */
function nearestIndexAt(points: readonly RoutePoint[], width: number, x: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = Math.abs(xForKm(points, width, point.km) - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * The route's elevation against distance, coloured by the conditions met on each stretch.
 * Once a plan is loaded, pointing at it (or tapping, or arrow keys) shows that point's details.
 */
export function ElevationProfile({
  points,
  snowLineM,
  details,
  activeIndex,
  showCard,
  onActiveIndexChange,
  className,
}: ElevationProfileProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const inspectable = details?.length === points.length;
  const activeDetails = activeIndex === null ? undefined : details?.[activeIndex];
  const description = describeProfile(points, snowLineM);

  const clear = useEffectEvent(() => {
    onActiveIndexChange(null);
  });
  // Escape hides the card even when the pointer, not focus, is on the profile.
  useEffect(() => {
    if (!showCard || activeIndex === null) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') clear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCard, activeIndex]);

  const selectAt = (event: PointerEvent<HTMLDivElement>) => {
    if (!inspectable) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onActiveIndexChange(nearestIndexAt(points, bounds.width, event.clientX - bounds.left));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const steps: Record<string, number> = {
      ArrowLeft: (activeIndex ?? 1) - 1,
      ArrowRight: (activeIndex ?? -1) + 1,
      Home: 0,
      End: last,
    };
    const next = steps[event.key];
    if (next !== undefined) {
      event.preventDefault();
      onActiveIndexChange(Math.min(Math.max(next, 0), last));
    } else if (event.key === 'Escape') {
      onActiveIndexChange(null);
    }
  };

  const guideX =
    size && activeIndex !== null && points[activeIndex]
      ? xForKm(points, size.width, points[activeIndex].km)
      : null;
  const cardWidth = Math.min(CARD_WIDTH, size?.width ?? CARD_WIDTH);
  const cardLeft =
    size && guideX !== null
      ? Math.min(
          Math.max(
            guideX + CARD_GAP + cardWidth <= size.width
              ? guideX + CARD_GAP
              : guideX - CARD_GAP - cardWidth,
            0,
          ),
          Math.max(size.width - cardWidth, 0),
        )
      : 0;

  return (
    <div
      ref={ref}
      {...(inspectable
        ? {
            role: 'slider',
            tabIndex: 0,
            'aria-label': description,
            'aria-valuemin': 0,
            'aria-valuemax': points.length - 1,
            'aria-valuenow': activeIndex ?? 0,
            'aria-valuetext': activeDetails
              ? describePoint(activeDetails)
              : 'Use the arrow keys to inspect points along the trail',
          }
        : { role: 'img', 'aria-label': description })}
      onPointerMove={selectAt}
      onPointerDown={selectAt}
      onPointerLeave={(event) => {
        // A finger lifting also "leaves"; on touch the card stays until a tap elsewhere.
        if (inspectable && event.pointerType !== 'touch') onActiveIndexChange(null);
      }}
      onBlur={() => {
        if (showCard) onActiveIndexChange(null);
      }}
      onKeyDown={inspectable ? handleKeyDown : undefined}
      className={cn(
        'relative rounded-control',
        inspectable && 'cursor-crosshair touch-pan-y',
        className,
      )}
    >
      {size && size.width > 0 && size.height > AXIS_HEIGHT && points.length >= 2 && (
        <ProfileChart
          width={size.width}
          height={size.height}
          points={points}
          snowLineM={snowLineM}
          activeIndex={activeIndex}
        />
      )}
      {showCard && activeDetails && (
        <div
          style={{ left: cardLeft, width: cardWidth }}
          className="pointer-events-none absolute top-0 rounded-control border-[0.5px] border-separator bg-surface-raised p-2.5 shadow-panel transition-colors"
        >
          <PointDetails point={activeDetails} />
        </div>
      )}
    </div>
  );
}

interface ProfileChartProps {
  width: number;
  height: number;
  points: readonly RoutePoint[];
  snowLineM: number | null;
  activeIndex: number | null;
}

function ProfileChart({ width, height, points, snowLineM, activeIndex }: ProfileChartProps) {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const range = elevationRange(points);
  const { floor, ceiling } = range;
  const plotTop = INSET;
  const plotBottom = height - AXIS_HEIGHT;
  const plotLeft = INSET;
  const plotRight = width - INSET;
  const distance = last.km - first.km;

  const x = (km: number) => xForKm(points, width, km);
  const y = (elevation: number) =>
    plotTop + ((ceiling - elevation) / (ceiling - floor)) * (plotBottom - plotTop);

  const outline = points.map((point) => `${x(point.km)},${y(point.ele_m)}`).join(' L ');
  const area = `M ${x(first.km)},${plotBottom} L ${outline} L ${x(last.km)},${plotBottom} Z`;

  const showSnowLine = isSnowLineShown(snowLineM, range);
  const snowY = snowLineM === null ? 0 : y(snowLineM);
  // Caption above the dashed line, or below it when the line runs close to the top.
  const snowLabelY = snowY - 6 < plotTop + 12 ? snowY + 14 : snowY - 6;
  const active = activeIndex === null ? undefined : points[activeIndex];

  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 overflow-visible"
    >
      <path d={area} className="fill-fill transition-colors" />
      {stretches(points).map(([from, to], index) => {
        const status = stretchStatus(from, to);
        const tone = status === null ? 'neutral' : SEGMENT_STATUSES[status].tone;
        return (
          <line
            key={index}
            x1={x(from.km)}
            y1={y(from.ele_m)}
            x2={x(to.km)}
            y2={y(to.ele_m)}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            className={cn('transition-colors', TONE_STROKE_CLASSES[tone])}
          />
        );
      })}
      {showSnowLine && snowLineM !== null && (
        <g>
          <line
            x1={plotLeft}
            x2={plotRight}
            y1={snowY}
            y2={snowY}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            className="stroke-snow transition-colors"
          />
          <text
            x={plotLeft + 4}
            y={snowLabelY}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke"
            className="fill-snow-text stroke-surface text-caption transition-colors"
          >
            Snow line {formatMeters(snowLineM)}
          </text>
        </g>
      )}
      {active && (
        <g>
          <line
            x1={x(active.km)}
            x2={x(active.km)}
            y1={plotTop}
            y2={plotBottom}
            strokeWidth={1}
            className="stroke-label-secondary"
          />
          <circle
            cx={x(active.km)}
            cy={y(active.ele_m)}
            r={4.5}
            strokeWidth={2}
            className="fill-surface stroke-label"
          />
        </g>
      )}
      <g className="fill-label-secondary text-caption transition-colors">
        <text x={plotLeft} y={height - 4}>
          Trailhead
        </text>
        <text x={(plotLeft + plotRight) / 2} y={height - 4} textAnchor="middle">
          {formatKm(distance)} one way
        </text>
        <text x={plotRight} y={height - 4} textAnchor="end">
          Top
        </text>
      </g>
    </svg>
  );
}
