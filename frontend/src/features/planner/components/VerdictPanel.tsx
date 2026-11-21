import { Unplug } from 'lucide-react';
import type { HTMLMotionProps } from 'motion/react';
import { useId } from 'react';

import {
  errorMessage,
  isUnreachableError,
  UNREACHABLE_HINT,
  UNREACHABLE_TITLE,
} from '@/api/client';
import type { PlanResponse } from '@/api/types';
import { MetricGrid, MetricTile } from '@/components/plan/Metrics';
import { ReasonList } from '@/components/plan/ReasonList';
import { TurnaroundTime } from '@/components/plan/TurnaroundTime';
import { VerdictPill } from '@/components/plan/VerdictPill';
import { AnimatedHeight } from '@/components/ui/AnimatedHeight';
import { Button } from '@/components/ui/Button';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { cn } from '@/lib/cn';
import { VERDICTS } from '@/lib/status';
import { formatClock } from '@/lib/time';

interface VerdictPanelProps extends Omit<HTMLMotionProps<'section'>, 'children'> {
  plan: PlanResponse | undefined;
  /** True while `plan` is the previous plan, kept on screen until the next one arrives. */
  isStale: boolean;
  /** The plan on screen is for another trail or day: dim it at once rather than after a pause. */
  isOtherTrailOrDay: boolean;
  error: Error | null;
  onRetry: () => void;
}

/** Go / Caution / Not today, the turnaround time, the reasons and the key clock times. */
export function VerdictPanel({
  plan,
  isStale,
  isOtherTrailOrDay,
  error,
  onRetry,
  ...panelProps
}: VerdictPanelProps) {
  const headingId = useId();

  return (
    <Panel floating aria-labelledby={headingId} {...panelProps}>
      <h2 id={headingId} className="sr-only">
        Verdict
      </h2>
      <AnimatedHeight>
        <div className="p-5">
          {plan ? (
            <VerdictContent plan={plan} isStale={isStale} dimAtOnce={isOtherTrailOrDay} />
          ) : error ? (
            <VerdictError error={error} onRetry={onRetry} />
          ) : (
            <VerdictSkeleton />
          )}
        </div>
      </AnimatedHeight>
    </Panel>
  );
}

interface VerdictContentProps {
  plan: PlanResponse;
  isStale: boolean;
  dimAtOnce: boolean;
}

function VerdictContent({ plan, isStale, dimAtOnce }: VerdictContentProps) {
  const { summary, verdict } = plan;

  return (
    <div
      aria-busy={isStale}
      className={cn(
        'flex flex-col gap-5 transition-opacity',
        // Dim only if the next plan takes a moment, so quick updates never flicker.
        isStale ? cn('opacity-60', !dimAtOnce && 'delay-200') : 'opacity-100',
      )}
    >
      <p className="sr-only" aria-live="polite">
        {isStale
          ? ''
          : `${VERDICTS[verdict.level].label}. Turn around by ${formatClock(summary.turnaround_by)}.`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <VerdictPill level={verdict.level} />
        {plan.source === 'mock' && <Pill variant="outline">Sample data</Pill>}
      </div>
      <TurnaroundTime time={summary.turnaround_by} />
      {verdict.reasons.length > 0 && <ReasonList reasons={verdict.reasons} />}
      <MetricGrid>
        <MetricTile label="At the top" time={summary.top_eta} />
        <MetricTile label="Back, slow day" time={summary.finish_p90} />
        <MetricTile label="Sunset" time={summary.sunset} />
        <MetricTile label="Last light" time={summary.last_light} />
      </MetricGrid>
    </div>
  );
}

function VerdictError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (isUnreachableError(error)) {
    return (
      <StatusMessage
        alert
        icon={Unplug}
        title={UNREACHABLE_TITLE}
        message={UNREACHABLE_HINT}
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
        className="py-6"
      />
    );
  }
  return <ErrorCard message={errorMessage(error)} onRetry={onRetry} />;
}

function VerdictSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      <Skeleton className="h-[30px] w-28 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-[62px]" />
        ))}
      </div>
    </div>
  );
}
