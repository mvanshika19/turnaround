import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useId } from 'react';

import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group, e.g. "Fitness". */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Show only each option's icon; its label stays available to assistive technology. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * An Apple-style segmented control built on native radio buttons, so arrow keys, focus and
 * screen readers behave as users expect. The selected thumb glides between segments.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  iconOnly = false,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-0.5 rounded-control bg-fill p-0.5 transition-colors',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <label
            key={option.value}
            title={iconOnly ? option.label : undefined}
            className={cn(
              'relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-segment text-footnote font-medium text-label select-none has-focus-visible:outline-2 has-focus-visible:outline-accent lg:min-h-8 lg:min-w-8',
              iconOnly ? 'px-2' : 'px-3',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${name}-thumb`}
                aria-hidden
                className="absolute inset-0 rounded-segment bg-control-thumb shadow-control-thumb"
              />
            )}
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => {
                onChange(option.value);
              }}
              aria-label={iconOnly ? option.label : undefined}
              className="sr-only"
            />
            {Icon && <Icon aria-hidden className="relative size-4" />}
            {!iconOnly && <span className="relative">{option.label}</span>}
          </label>
        );
      })}
    </div>
  );
}
