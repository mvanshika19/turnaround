import { CalendarDays, Clock } from 'lucide-react';
import { useMemo } from 'react';

import type { PlanResponse } from '@/api/types';
import { LazyTrailMap } from '@/components/map/LazyTrailMap';
import type { MapPadding } from '@/components/map/types';
import { Disclaimer } from '@/components/plan/Disclaimer';
import { MetricGrid, MetricTile } from '@/components/plan/Metrics';
import { ReasonList } from '@/components/plan/ReasonList';
import { TurnaroundTime } from '@/components/plan/TurnaroundTime';
import { VerdictPill } from '@/components/plan/VerdictPill';
import { ButtonLink } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { routeFromPlan } from '@/lib/route';
import { formatClock, formatLongDate } from '@/lib/time';
import { useTheme } from '@/theme/useTheme';

/** Extra room at the bottom for the map's attribution, which stays open on a static map. */
const MAP_PADDING: MapPadding = { top: 28, right: 28, bottom: 64, left: 28 };

const CARD_CLASSES =
  'w-full max-w-[560px] rounded-card border-[0.5px] border-separator bg-surface shadow-panel transition-colors';

/** A read-only plan someone shared: what, when, the verdict and when to turn around. */
export function SharedPlanCard({ plan }: { plan: PlanResponse }) {
  const { resolvedTheme } = useTheme();
  const { trail, summary, verdict, request } = plan;
  const points = useMemo(() => routeFromPlan(plan), [plan]);

  return (
    <article className={CARD_CLASSES}>
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-title">{trail.name}</h1>
          <p className="text-callout text-label-secondary">{trail.area}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="size-4 text-label-secondary" />
              {formatLongDate(request.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-4 text-label-secondary" />
              Starting {formatClock(summary.start)}
            </span>
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictPill level={verdict.level} />
          {plan.source === 'mock' && <Pill variant="outline">Sample data</Pill>}
        </div>
        <TurnaroundTime time={summary.turnaround_by} />
        <MetricGrid>
          <MetricTile label="Back, slow day" time={summary.finish_p90} />
          <MetricTile label="Last light" time={summary.last_light} />
        </MetricGrid>
        {verdict.reasons.length > 0 && <ReasonList reasons={verdict.reasons} />}
        <LazyTrailMap
          points={points}
          routeKey={trail.id}
          theme={resolvedTheme}
          padding={MAP_PADDING}
          label={`Map of the route up ${trail.name}`}
          interactive={false}
          className="h-60 rounded-control"
        />
        <Disclaimer />
        <ButtonLink to="/" variant="secondary" className="self-start">
          Plan your own hike
        </ButtonLink>
      </div>
    </article>
  );
}

/** The card's shape while the plan loads. */
export function SharedPlanSkeleton() {
  return (
    <div aria-hidden className={CARD_CLASSES}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-[30px] w-28 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-[62px]" />
          <Skeleton className="h-[62px]" />
        </div>
        <Skeleton className="h-60" />
      </div>
    </div>
  );
}
