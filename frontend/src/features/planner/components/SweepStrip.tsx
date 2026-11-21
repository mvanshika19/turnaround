import type { LocalTime, SweepItem } from '@/api/types';
import { cn } from '@/lib/cn';
import { VERDICTS } from '@/lib/status';
import { TONE_FILL_CLASSES } from '@/lib/tone';

interface SweepStripProps {
  items: readonly SweepItem[];
  current: LocalTime;
}

/**
 * One small segment per start time, coloured by its verdict and centred under the slider knob's
 * position for that start. The current start stands taller. Decorative: the slider's value text
 * and the "latest start" note carry the same information for assistive technology.
 */
export function SweepStrip({ items, current }: SweepStripProps) {
  const gaps = Math.max(items.length - 1, 1);

  return (
    <div aria-hidden className="relative h-3">
      {items.map((item, index) => (
        <span
          key={item.start}
          style={{
            left: `calc(var(--range-thumb) / 2 + ${index / gaps} * (100% - var(--range-thumb)))`,
            width: `calc((100% - var(--range-thumb)) / ${gaps} - 2px)`,
          }}
          className={cn(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[height,background-color]',
            TONE_FILL_CLASSES[VERDICTS[item.level].tone],
            item.start === current ? 'h-3' : 'h-1.5',
          )}
        />
      ))}
    </div>
  );
}
