import { useMemo, useReducer } from 'react';

import type { Fitness, Gear, IsoDate, LocalTime, PlanRequest } from '@/api/types';
import { addDays } from '@/lib/time';

/** `custom` is a date the co-pilot suggested that is neither today nor tomorrow. */
export type DayChoice = 'today' | 'tomorrow' | 'custom';

/** Everything the hiker has chosen. `trailId` is null until they pick one (a default applies). */
export interface PlannerState {
  trailId: string | null;
  day: DayChoice;
  /** The date when `day` is `custom`, otherwise null. */
  customDate: IsoDate | null;
  start: LocalTime;
  fitness: Fitness;
  gear: Gear;
}

type PlannerAction =
  | { type: 'selectTrail'; trailId: string }
  | { type: 'setDay'; day: DayChoice }
  | { type: 'setStart'; start: LocalTime }
  | { type: 'setFitness'; fitness: Fitness }
  | { type: 'setGear'; item: keyof Gear; enabled: boolean }
  | { type: 'applyRequest'; request: PlanRequest; today: IsoDate | undefined };

const INITIAL_STATE: PlannerState = {
  trailId: null,
  day: 'tomorrow',
  customDate: null,
  start: '13:00',
  fitness: 'average',
  gear: { headlamp: true, traction: true },
};

function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'selectTrail':
      return { ...state, trailId: action.trailId };
    case 'setDay':
      return {
        ...state,
        day: action.day,
        customDate: action.day === 'custom' ? state.customDate : null,
      };
    case 'setStart':
      return { ...state, start: action.start };
    case 'setFitness':
      return { ...state, fitness: action.fitness };
    case 'setGear':
      return { ...state, gear: { ...state.gear, [action.item]: action.enabled } };
    case 'applyRequest': {
      const { request, today } = action;
      const day: DayChoice =
        request.date === today
          ? 'today'
          : today !== undefined && request.date === addDays(today, 1)
            ? 'tomorrow'
            : 'custom';
      return {
        trailId: request.trail_id,
        day,
        customDate: day === 'custom' ? request.date : null,
        start: request.start,
        fitness: request.fitness,
        gear: { ...request.gear },
      };
    }
  }
}

export interface PlannerActions {
  selectTrail: (trailId: string) => void;
  setDay: (day: DayChoice) => void;
  setStart: (start: LocalTime) => void;
  setFitness: (fitness: Fitness) => void;
  setGear: (item: keyof Gear, enabled: boolean) => void;
  /** Shows a whole plan, e.g. one the co-pilot suggested. `today` is Vancouver's date from the API. */
  applyRequest: (request: PlanRequest, today: IsoDate | undefined) => void;
}

/** The hiker's choices on the planner page, in one reducer. */
export function usePlannerState(): { state: PlannerState; actions: PlannerActions } {
  const [state, dispatch] = useReducer(plannerReducer, INITIAL_STATE);

  const actions = useMemo<PlannerActions>(
    () => ({
      selectTrail: (trailId) => {
        dispatch({ type: 'selectTrail', trailId });
      },
      setDay: (day) => {
        dispatch({ type: 'setDay', day });
      },
      setStart: (start) => {
        dispatch({ type: 'setStart', start });
      },
      setFitness: (fitness) => {
        dispatch({ type: 'setFitness', fitness });
      },
      setGear: (item, enabled) => {
        dispatch({ type: 'setGear', item, enabled });
      },
      applyRequest: (request, today) => {
        dispatch({ type: 'applyRequest', request, today });
      },
    }),
    [],
  );

  return { state, actions };
}
