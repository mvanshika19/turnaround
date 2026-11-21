import { keepPreviousData, queryOptions, skipToken, useQuery } from '@tanstack/react-query';

import { api } from './client';
import type { SweepParams } from './client';
import type { PlanRequest } from './types';

const FIVE_MINUTES = 5 * 60 * 1000;

export const queryKeys = {
  health: ['health'] as const,
  trails: ['trails'] as const,
  trail: (trailId: string | undefined) => ['trails', trailId] as const,
  sweep: (params: SweepParams | undefined) => ['sweep', params] as const,
  planRequests: ['plans', 'request'] as const,
  plan: (request: PlanRequest | undefined) => ['plans', 'request', request] as const,
  planById: (planId: string | undefined) => ['plans', 'id', planId] as const,
};

/** One trail with its geometry. Shared by the planner and the trail picker's hover prefetch. */
export function trailQueryOptions(trailId: string | undefined) {
  return queryOptions({
    queryKey: queryKeys.trail(trailId),
    queryFn: trailId === undefined ? skipToken : ({ signal }) => api.trail(trailId, signal),
    staleTime: FIVE_MINUTES,
  });
}

/**
 * The plan for one request. `POST /api/plans` is idempotent, so a plan is cached like a read
 * and shared by the planner, the start-time prefetch and the Share button.
 */
export function planQueryOptions(request: PlanRequest | undefined) {
  return queryOptions({
    queryKey: queryKeys.plan(request),
    // The signal lets a prefetch that nobody needs any more give its connection back.
    queryFn: request === undefined ? skipToken : ({ signal }) => api.createPlan(request, signal),
    staleTime: FIVE_MINUTES,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => api.health(signal),
    staleTime: FIVE_MINUTES,
  });
}

export function useTrails() {
  return useQuery({
    queryKey: queryKeys.trails,
    queryFn: ({ signal }) => api.trails(signal),
    staleTime: FIVE_MINUTES,
  });
}

export function useTrail(trailId: string | undefined) {
  return useQuery(trailQueryOptions(trailId));
}

/**
 * Verdicts for every start time. While a new fitness or gear choice loads, the previous sweep for
 * the same trail and day stays on screen (marked as placeholder); another trail or day starts empty.
 */
export function useSweep(params: SweepParams | undefined) {
  return useQuery({
    queryKey: queryKeys.sweep(params),
    queryFn: params === undefined ? skipToken : ({ signal }) => api.sweep(params, signal),
    staleTime: FIVE_MINUTES,
    placeholderData: (previous) =>
      previous?.trail_id === params?.trailId && previous?.date === params?.date
        ? previous
        : undefined,
  });
}

/** The current plan. The previous plan stays on screen while the next one loads. */
export function usePlan(request: PlanRequest | undefined) {
  return useQuery({ ...planQueryOptions(request), placeholderData: keepPreviousData });
}

export function usePlanById(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.planById(planId),
    queryFn: planId === undefined ? skipToken : ({ signal }) => api.plan(planId, signal),
    staleTime: FIVE_MINUTES,
  });
}
