import { noop, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useId } from 'react';

import { trailQueryOptions } from '@/api/queries';
import type { TrailSummary } from '@/api/types';
import { Pill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatKm, formatMeters } from '@/lib/format';
import { DIFFICULTY_LABELS } from '@/lib/status';

interface TrailPickerProps {
  trails: readonly TrailSummary[] | undefined;
  selectedId: string | undefined;
  onSelect: (trailId: string) => void;
}

/**
 * One row per trail, built on native radio buttons so arrow keys move the selection. An accent
 * outline glides to the chosen row. Hovering or focusing a row fetches its route ahead of the click.
 */
export function TrailPicker({ trails, selectedId, onSelect }: TrailPickerProps) {
  const name = useId();
  const queryClient = useQueryClient();

  if (!trails) {
    return (
      <div aria-hidden className="-mx-3 flex flex-col gap-1">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-2 px-3 py-2.5">
            <Skeleton className="h-[18px] w-2/5" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const prefetchRoute = (trailId: string) => {
    queryClient.query(trailQueryOptions(trailId)).catch(noop);
  };

  return (
    <div role="radiogroup" aria-label="Trail" className="-mx-3 flex flex-col gap-1">
      {trails.map((trail) => {
        const selected = trail.id === selectedId;
        return (
          <label
            key={trail.id}
            onPointerEnter={() => {
              prefetchRoute(trail.id);
            }}
            className={cn(
              'relative flex cursor-pointer flex-col gap-0.5 rounded-card px-3 py-2.5 transition-colors select-none has-focus-visible:outline-2 has-focus-visible:outline-accent',
              !selected && 'hover:bg-fill',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${name}-selection`}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-card ring-2 ring-accent ring-inset"
              />
            )}
            <input
              type="radio"
              name={name}
              value={trail.id}
              checked={selected}
              onChange={() => {
                onSelect(trail.id);
              }}
              onFocus={() => {
                prefetchRoute(trail.id);
              }}
              className="sr-only"
            />
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-headline">{trail.name}</span>
              <Pill>{DIFFICULTY_LABELS[trail.difficulty]}</Pill>
            </span>
            <span className="text-footnote text-label-secondary">{trail.area}</span>
            <span className="flex items-center justify-between gap-3 text-footnote text-label-secondary">
              <span>
                {formatKm(trail.distance_km)} round trip · {formatMeters(trail.gain_m)} gain
              </span>
              {trail.is_sample && <Pill variant="outline">Sample route</Pill>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
