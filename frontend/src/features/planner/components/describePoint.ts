import type { PlanPoint } from '@/api/types';
import { formatKm, formatMeters } from '@/lib/format';
import { SEGMENT_STATUSES } from '@/lib/status';
import { formatClock } from '@/lib/time';

/** "1.8 km from trailhead, 742 m, up about 11:52 am, …" for assistive technology. */
export function describePoint(point: PlanPoint): string {
  return [
    `${formatKm(point.km)} from trailhead`,
    formatMeters(point.ele_m),
    `up about ${formatClock(point.eta_up)}`,
    `back about ${formatClock(point.eta_down)}`,
    `slow day ${formatClock(point.eta_down_p90)}`,
    point.temp_c === null ? null : `${Math.round(point.temp_c).toString()} °C`,
    SEGMENT_STATUSES[point.status].label,
  ]
    .filter((part) => part !== null)
    .join(', ');
}
