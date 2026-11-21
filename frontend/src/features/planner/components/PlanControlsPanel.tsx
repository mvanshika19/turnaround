import type { HTMLMotionProps } from 'motion/react';
import { useId } from 'react';

import { errorMessage } from '@/api/client';
import type { IsoDate, LocalTime, SweepResponse, TrailSummary } from '@/api/types';
import { Disclaimer } from '@/components/plan/Disclaimer';
import { Panel } from '@/components/ui/Panel';
import { cn } from '@/lib/cn';
import { formatLongDate } from '@/lib/time';

import type { PlannerActions, PlannerState } from '../hooks/usePlannerState';
import { ControlSection } from './ControlSection';
import { DayControl } from './DayControl';
import { FitnessControl } from './FitnessControl';
import { GearControls } from './GearControls';
import { StartTimeControl } from './StartTimeControl';
import { TrailPicker } from './TrailPicker';

interface PlanControlsPanelProps extends Omit<HTMLMotionProps<'section'>, 'children'> {
  state: PlannerState;
  actions: PlannerActions;
  trails: readonly TrailSummary[] | undefined;
  trailId: string | undefined;
  date: IsoDate | undefined;
  /** The start actually planned: the hiker's choice, snapped to the sweep's starts. */
  start: LocalTime;
  sweep: SweepResponse | undefined;
  sweepIsStale: boolean;
  sweepError: Error | null;
  onRetrySweep: () => void;
}

/** "Plan your hike": trail, day, start time, fitness and gear, then the disclaimer. */
export function PlanControlsPanel({
  state,
  actions,
  trails,
  trailId,
  date,
  start,
  sweep,
  sweepIsStale,
  sweepError,
  onRetrySweep,
  className,
  ...panelProps
}: PlanControlsPanelProps) {
  const headingId = useId();

  return (
    <Panel
      floating
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-6 p-5', className)}
      {...panelProps}
    >
      <h2 id={headingId} className="text-title">
        Plan your hike
      </h2>
      <ControlSection title="Trail">
        <TrailPicker trails={trails} selectedId={trailId} onSelect={actions.selectTrail} />
      </ControlSection>
      <DayControl day={state.day} date={date} onChange={actions.setDay} />
      <StartTimeControl
        start={start}
        dayPhrase={state.day === 'custom' && date ? `on ${formatLongDate(date)}` : state.day}
        sweep={sweep}
        isStale={sweepIsStale}
        error={sweepError ? errorMessage(sweepError) : null}
        onRetry={onRetrySweep}
        onChange={actions.setStart}
      />
      <FitnessControl fitness={state.fitness} onChange={actions.setFitness} />
      <GearControls gear={state.gear} onChange={actions.setGear} />
      <Disclaimer className="border-t-[0.5px] border-separator pt-4" />
    </Panel>
  );
}
