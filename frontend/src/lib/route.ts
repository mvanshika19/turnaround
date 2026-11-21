import type { PlanResponse, SegmentStatus, Trail } from '@/api/types';

import { worseStatus } from './status';

/** A point on the outbound route. `status` is null until a plan has assessed the conditions. */
export interface RoutePoint {
  km: number;
  lat: number;
  lon: number;
  ele_m: number;
  status: SegmentStatus | null;
}

export function routeFromPlan(plan: PlanResponse): RoutePoint[] {
  return plan.points.map(({ km, lat, lon, ele_m, status }) => ({ km, lat, lon, ele_m, status }));
}

export function routeFromTrail(trail: Trail): RoutePoint[] {
  return trail.points.map(({ km, lat, lon, ele_m }) => ({ km, lat, lon, ele_m, status: null }));
}

/** Each pair of neighbouring points, trailhead first. */
export function stretches(points: readonly RoutePoint[]): [RoutePoint, RoutePoint][] {
  const pairs: [RoutePoint, RoutePoint][] = [];
  points.forEach((to, index) => {
    const from = points[index - 1];
    if (from) pairs.push([from, to]);
  });
  return pairs;
}

/** The condition of the stretch between two neighbouring points: the worse of its two ends. */
export function stretchStatus(from: RoutePoint, to: RoutePoint): SegmentStatus | null {
  return worseStatus(from.status, to.status);
}
