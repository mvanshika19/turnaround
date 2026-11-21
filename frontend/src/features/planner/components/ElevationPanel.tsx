import type { HTMLMotionProps } from 'motion/react';
import { useId } from 'react';

import type { PlanPoint, SegmentStatus } from '@/api/types';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import type { RoutePoint } from '@/lib/route';
import { SEGMENT_STATUSES } from '@/lib/status';
import { TONE_FILL_CLASSES } from '@/lib/tone';

import { ElevationProfile } from './ElevationProfile';

const LEGEND_ORDER: readonly SegmentStatus[] = ['daylight', 'snow', 'dark'];

interface ElevationPanelProps extends Omit<HTMLMotionProps<'section'>, 'children'> {
  points: readonly RoutePoint[] | undefined;
  snowLineM: number | null;
  details: readonly PlanPoint[] | undefined;
  activeIndex: number | null;
  showCard: boolean;
  onActiveIndexChange: (index: number | null) => void;
}

/** The elevation profile with its legend. On wide screens it fills a fixed-height bottom panel. */
export function ElevationPanel({
  points,
  snowLineM,
  details,
  activeIndex,
  showCard,
  onActiveIndexChange,
  className,
  ...panelProps
}: ElevationPanelProps) {
  const headingId = useId();

  return (
    <Panel
      floating
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-2 p-4', className)}
      {...panelProps}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-headline">
          Elevation
        </h2>
        <ul aria-label="Legend" className="flex flex-wrap gap-x-3 gap-y-1">
          {LEGEND_ORDER.map((status) => {
            const { label, tone } = SEGMENT_STATUSES[status];
            return (
              <li
                key={status}
                className="flex items-center gap-1.5 text-footnote text-label-secondary"
              >
                <span aria-hidden className={cn('size-2 rounded-full', TONE_FILL_CLASSES[tone])} />
                {label}
              </li>
            );
          })}
        </ul>
      </div>
      {points && points.length >= 2 ? (
        <ElevationProfile
          points={points}
          snowLineM={snowLineM}
          details={details}
          activeIndex={activeIndex}
          showCard={showCard}
          onActiveIndexChange={onActiveIndexChange}
          className="h-[140px] lg:h-auto lg:min-h-0 lg:flex-1"
        />
      ) : (
        <Skeleton className="h-[140px] lg:h-auto lg:min-h-0 lg:flex-1" />
      )}
    </Panel>
  );
}
