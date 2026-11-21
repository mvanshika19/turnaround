import type { PlanPoint } from '@/api/types';
import { cn } from '@/lib/cn';
import { formatKm, formatMeters } from '@/lib/format';
import { SEGMENT_STATUSES } from '@/lib/status';
import { formatClock } from '@/lib/time';
import { TONE_FILL_CLASSES } from '@/lib/tone';

/** One point on the route: where it is, when you pass it, and the conditions there. */
export function PointDetails({ point, className }: { point: PlanPoint; className?: string }) {
  const { label, tone } = SEGMENT_STATUSES[point.status];

  return (
    <div className={cn('flex flex-col gap-1.5 text-footnote text-label', className)}>
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{formatKm(point.km)} from trailhead</span>
        <span className="text-label-secondary">{formatMeters(point.ele_m)}</span>
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 [&>li]:whitespace-nowrap">
        <li>Up about {formatClock(point.eta_up)}</li>
        <li>Back about {formatClock(point.eta_down)}</li>
        <li>Slow day {formatClock(point.eta_down_p90)}</li>
        {point.temp_c !== null && <li>{Math.round(point.temp_c).toString()} °C</li>}
      </ul>
      <p className="flex items-center gap-1.5 text-label-secondary">
        <span aria-hidden className={cn('size-2 rounded-full', TONE_FILL_CLASSES[tone])} />
        {label}
      </p>
    </div>
  );
}
