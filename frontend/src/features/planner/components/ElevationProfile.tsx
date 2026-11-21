import { useElementSize } from '@/hooks/useElementSize';
import { cn } from '@/lib/cn';
import { formatKm, formatMeters } from '@/lib/format';
import { stretches, stretchStatus } from '@/lib/route';
import type { RoutePoint } from '@/lib/route';
import { SEGMENT_STATUSES } from '@/lib/status';
import { TONE_STROKE_CLASSES } from '@/lib/tone';

interface ElevationProfileProps {
  /** The outbound route, trailhead first. */
  points: readonly RoutePoint[];
  snowLineM: number | null;
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

/** The route's elevation against distance, coloured by the conditions met on each stretch. */
export function ElevationProfile({ points, snowLineM, className }: ElevationProfileProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();

  return (
    <div ref={ref} className={cn('relative', className)}>
      {size && size.width > 0 && size.height > AXIS_HEIGHT && points.length >= 2 && (
        <ProfileChart
          width={size.width}
          height={size.height}
          points={points}
          snowLineM={snowLineM}
        />
      )}
    </div>
  );
}

interface ProfileChartProps {
  width: number;
  height: number;
  points: readonly RoutePoint[];
  snowLineM: number | null;
}

function ProfileChart({ width, height, points, snowLineM }: ProfileChartProps) {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const elevations = points.map((point) => point.ele_m);
  const lowest = Math.min(...elevations);
  const highest = Math.max(...elevations);
  const span = Math.max(highest - lowest, MIN_RANGE_M);
  const floor = lowest - span * RANGE_PADDING;
  const ceiling = highest + span * RANGE_PADDING;

  const plotTop = INSET;
  const plotBottom = height - AXIS_HEIGHT;
  const plotLeft = INSET;
  const plotRight = width - INSET;
  const distance = last.km - first.km;

  const x = (km: number) =>
    plotLeft + (distance > 0 ? ((km - first.km) / distance) * (plotRight - plotLeft) : 0);
  const y = (elevation: number) =>
    plotTop + ((ceiling - elevation) / (ceiling - floor)) * (plotBottom - plotTop);

  const outline = points.map((point) => `${x(point.km)},${y(point.ele_m)}`).join(' L ');
  const area = `M ${x(first.km)},${plotBottom} L ${outline} L ${x(last.km)},${plotBottom} Z`;

  const showSnowLine = snowLineM !== null && snowLineM > floor && snowLineM < ceiling;
  const snowY = snowLineM === null ? 0 : y(snowLineM);
  // Caption above the dashed line, or below it when the line runs close to the top.
  const snowLabelY = snowY - 6 < plotTop + 12 ? snowY + 14 : snowY - 6;

  const description = [
    `Elevation profile: ${formatMeters(first.ele_m)} at the trailhead, ${formatMeters(last.ele_m)} at the top, over ${formatKm(distance)}.`,
    showSnowLine ? `Snow likely above ${formatMeters(snowLineM)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      role="img"
      aria-label={description}
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
      {showSnowLine && (
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
