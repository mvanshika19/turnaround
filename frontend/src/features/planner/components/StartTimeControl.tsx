import type { LocalTime, SweepResponse } from '@/api/types';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { VERDICTS } from '@/lib/status';
import { formatClock, fromMinutes, nearestTime, toMinutes } from '@/lib/time';

import { ControlSection } from './ControlSection';
import { SweepStrip } from './SweepStrip';

interface StartTimeControlProps {
  start: LocalTime;
  /** Ends "No start time gets a go …": "today", "tomorrow" or "on Tuesday, November 24". */
  dayPhrase: string;
  sweep: SweepResponse | undefined;
  /** True while `sweep` is the previous fitness or gear choice's, kept until the new one arrives. */
  isStale: boolean;
  /** The message to show when the sweep failed to load, with a way to retry it. */
  error: string | null;
  onRetry: () => void;
  onChange: (start: LocalTime) => void;
}

/**
 * The start-time readout, a native range slider stepping through the sweep's starts, the verdict
 * strip under it and the latest start that still gets a go.
 */
export function StartTimeControl({
  start,
  dayPhrase,
  sweep,
  isStale,
  error,
  onRetry,
  onChange,
}: StartTimeControlProps) {
  return (
    <ControlSection
      title="Start time"
      aside={<AnimatedText value={formatClock(start)} className="text-headline" />}
    >
      {sweep ? (
        <StartTimeSlider
          start={start}
          dayPhrase={dayPhrase}
          sweep={sweep}
          isStale={isStale}
          onChange={onChange}
        />
      ) : error ? (
        <ErrorCard message={error} onRetry={onRetry} />
      ) : (
        <div aria-hidden className="flex flex-col gap-2 py-1">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      )}
    </ControlSection>
  );
}

interface StartTimeSliderProps {
  start: LocalTime;
  dayPhrase: string;
  sweep: SweepResponse;
  isStale: boolean;
  onChange: (start: LocalTime) => void;
}

function StartTimeSlider({ start, dayPhrase, sweep, isStale, onChange }: StartTimeSliderProps) {
  const { items, interval_min: interval, latest_go_start: latestGo } = sweep;
  const starts = items.map((item) => item.start);
  const min = toMinutes(starts[0] ?? start);
  const max = toMinutes(starts.at(-1) ?? start);
  const value = toMinutes(start);
  const progress = max > min ? (value - min) / (max - min) : 0;
  // A stale sweep's verdicts belong to the previous choices, so they aren't announced.
  const level = isStale ? undefined : items.find((item) => item.start === start)?.level;

  return (
    <div className="range-field flex flex-col gap-1">
      <input
        type="range"
        min={min}
        max={max}
        step={interval}
        value={value}
        onChange={(event) => {
          onChange(nearestTime(fromMinutes(Number(event.target.value)), starts));
        }}
        aria-label="Start time"
        aria-valuetext={
          level ? `${formatClock(start)}, ${VERDICTS[level].label}` : formatClock(start)
        }
        style={{
          '--range-progress': `calc(var(--range-thumb) / 2 + ${progress} * (100% - var(--range-thumb)))`,
        }}
        className="range-slider"
      />
      <div
        aria-busy={isStale}
        className={cn('flex flex-col gap-1 transition-opacity', isStale && 'opacity-40')}
      >
        <SweepStrip items={items} current={start} />
        <p className="mt-1 text-footnote text-label-secondary">
          {isStale
            ? 'Updating start times…'
            : latestGo
              ? `Latest start with a go: ${formatClock(latestGo)}`
              : `No start time gets a go ${dayPhrase}`}
        </p>
      </div>
    </div>
  );
}
