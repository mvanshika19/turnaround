import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/cn';
import { VALUE_FADE } from '@/lib/motion';

interface AnimatedTextProps {
  value: string;
  className?: string;
}

/**
 * Text that cross-fades with a short upward slide whenever its value changes. Assistive
 * technology reads only the current value, never the copy that is fading out.
 */
export function AnimatedText({ value, className }: AnimatedTextProps) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: '0.3em' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-0.3em' }}
            transition={VALUE_FADE}
            className="inline-block whitespace-nowrap"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
