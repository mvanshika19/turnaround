import type { ReactNode } from 'react';

import type { LocalTime } from '@/api/types';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';

/** A two-column grid of metric tiles. */
export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid grid-cols-2 gap-2', className)}>{children}</dl>;
}

/** One clock reading on a filled tile, e.g. "Sunset 5:22 pm". */
export function MetricTile({ label, time }: { label: string; time: LocalTime }) {
  return (
    <div className="rounded-control bg-fill px-3 py-2.5 transition-colors">
      <dt className="text-footnote">{label}</dt>
      <dd>
        <AnimatedText value={formatClock(time)} className="text-headline" />
      </dd>
    </div>
  );
}
