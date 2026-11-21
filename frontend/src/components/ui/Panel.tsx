import { motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';

import { cn } from '@/lib/cn';

interface PanelProps extends HTMLMotionProps<'section'> {
  /** Float over the map as a frosted panel on wide screens; a plain card otherwise. */
  floating?: boolean;
}

export function Panel({ floating = false, className, ...props }: PanelProps) {
  return (
    <motion.section
      className={cn(
        'rounded-card bg-surface transition-colors',
        floating &&
          'lg:material lg:rounded-panel lg:border-[0.5px] lg:border-separator lg:shadow-panel',
        className,
      )}
      {...props}
    />
  );
}
