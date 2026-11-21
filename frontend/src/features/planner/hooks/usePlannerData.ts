import { noop, useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useMemo } from 'react';

import type { SweepParams } from '@/api/client';
import {
  planQueryOptions,
  queryKeys,
  useHealth,
  usePlan,
  useSweep,
  useTrail,
  useTrails,
} from '@/api/queries';
import type {
  Fitness,
  IsoDate,
  LocalTime,
  PlanRequest,
  PlanResponse,
  SweepResponse,
  Trail,
  TrailSummary,
} from '@/api/types';
import { routeFromPlan, routeFromTrail } from '@/lib/route';
import type { RoutePoint } from '@/lib/route';
import { addDays, nearestTime, toMinutes } from '@/lib/time';

import type { PlannerState } from './usePlannerState';

const DEFAULT_TRAIL_ID = 'lynn-peak';

/** The route to draw on the map and the profile, and the trail it belongs to. */
interface DisplayRoute {
  trailId: string;
  points: RoutePoint[];
}

/** The hiker's pick, or Lynn Peak when it is offered, or else the first trail. */
function resolveTrailId(
  selected: string | null,
  trails: readonly TrailSummary[] | undefined,
): string | undefined {
  if (selected !== null) return selected;
  return (trails?.find((trail) => trail.id === DEFAULT_TRAIL_ID) ?? trails?.[0])?.id;
}

/**
 * The plan's route once it matches the selected trail; until then the bare trail geometry, so the
 * map and profile show the right route straight away; failing both, whatever plan is on screen.
 */
function displayRoute(
  trailId: string | undefined,
  plan: PlanResponse | undefined,
  trail: Trail | undefined,
): DisplayRoute | undefined {
  if (plan && plan.trail.id === trailId) return { trailId, points: routeFromPlan(plan) };
  if (trail && trail.id === trailId) return { trailId, points: routeFromTrail(trail) };
  if (plan) return { trailId: plan.trail.id, points: routeFromPlan(plan) };
  return undefined;
}

/** Wait for choices to settle before prefetching, so flicking through fitness levels is cheap. */
const PREFETCH_DELAY_MS = 150;
/** Parallel prefetches; browsers allow 6 connections per host, so the visible plan always gets one. */
const PREFETCH_CONCURRENCY = 3;

/**
 * Fetches the plan for every start in the sweep, nearest to the current start first, so dragging
 * the start-time slider shows each verdict instantly. Plans already cached are not fetched again.
 * When the sweep or the choices change, queued prefetches stop and unneeded in-flight ones abort.
 */
function usePrefetchSweepPlans(
  sweep: SweepResponse | undefined,
  start: LocalTime,
  fitness: Fitness,
  headlamp: boolean,
  traction: boolean,
): void {
  const queryClient = useQueryClient();
  const currentStart = useEffectEvent(() => toMinutes(start));

  useEffect(() => {
    if (!sweep) return;
    const origin = currentStart();
    const queue = sweep.items
      .map((item) => item.start)
      .sort((a, b) => Math.abs(toMinutes(a) - origin) - Math.abs(toMinutes(b) - origin))
      .map((itemStart) =>
        planQueryOptions({
          trail_id: sweep.trail_id,
          date: sweep.date,
          start: itemStart,
          fitness,
          profile_id: null,
          gear: { headlamp, traction },
        }),
      );
    let stopped = false;

    const work = async () => {
      for (let next = queue.shift(); next && !stopped; next = queue.shift()) {
        // `query` returns fresh cached data without a request. A failed prefetch is harmless:
        // the plan is fetched again, with retries, when it is shown.
        await queryClient.query(next).catch(noop);
      }
    };
    const timer = window.setTimeout(() => {
      for (let worker = 0; worker < PREFETCH_CONCURRENCY; worker += 1) void work();
    }, PREFETCH_DELAY_MS);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      // Abort prefetches nothing is showing; the plan on screen has an observer and is kept.
      void queryClient.cancelQueries({
        queryKey: queryKeys.planRequests,
        predicate: (query) => query.getObserversCount() === 0,
      });
    };
  }, [queryClient, sweep, fitness, headlamp, traction]);
}

/** Everything the planner page loads, derived from the hiker's choices. */
export function usePlannerData(state: PlannerState) {
  const health = useHealth();
  const trails = useTrails();

  const trailId = resolveTrailId(state.trailId, trails.data);
  const today = health.data?.today;
  const date: IsoDate | undefined =
    state.day === 'custom' && state.customDate !== null
      ? state.customDate
      : today === undefined
        ? undefined
        : state.day === 'today'
          ? today
          : addDays(today, 1);
  const { fitness } = state;
  const { headlamp, traction } = state.gear;

  const trail = useTrail(trailId);

  const sweepParams: SweepParams | undefined =
    trailId !== undefined && date !== undefined
      ? { trailId, date, fitness, headlamp, traction }
      : undefined;
  const sweep = useSweep(sweepParams);

  // Snap to the nearest start the sweep offers, e.g. if the planning window ever changes.
  const sweepStarts = sweep.data?.items.map((item) => item.start);
  const start: LocalTime = sweepStarts ? nearestTime(state.start, sweepStarts) : state.start;

  const planRequest: PlanRequest | undefined =
    trailId !== undefined && date !== undefined
      ? { trail_id: trailId, date, start, fitness, profile_id: null, gear: { headlamp, traction } }
      : undefined;
  const plan = usePlan(planRequest);

  usePrefetchSweepPlans(
    sweep.isPlaceholderData ? undefined : sweep.data,
    start,
    fitness,
    headlamp,
    traction,
  );

  const route = useMemo(
    () => displayRoute(trailId, plan.data, trail.data),
    [trailId, plan.data, trail.data],
  );

  const selectedTrail = trails.data?.find((summary) => summary.id === trailId);

  return {
    health,
    trails,
    trail,
    sweep,
    plan,
    trailId,
    selectedTrail,
    today,
    date,
    start,
    planRequest,
    route,
  };
}
