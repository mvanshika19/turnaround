import type { LocalTime } from '@/api/types';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { clockParts } from '@/lib/time';

/** The hero number: the latest time to turn back, in display size. */
export function TurnaroundTime({ time, className }: { time: LocalTime; className?: string }) {
  const { clock, period } = clockParts(time);

  return (
    <div className={className}>
      <p className="text-callout text-label-secondary">Turn around by</p>
      <p className="flex items-baseline gap-1.5">
        <AnimatedText value={clock} className="text-display" />
        <AnimatedText value={period} className="text-title" />
      </p>
      <p className="text-footnote text-label-secondary">if you’re not at the top yet</p>
    </div>
  );
}
