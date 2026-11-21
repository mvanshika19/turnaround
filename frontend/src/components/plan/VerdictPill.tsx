import { AnimatePresence, motion } from 'motion/react';

import type { VerdictLevel } from '@/api/types';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { cn } from '@/lib/cn';
import { VERDICTS } from '@/lib/status';
import { TONE_PILL_CLASSES } from '@/lib/tone';

/** Go / Caution / Not today. Colour fades and the icon turns over when the verdict changes. */
export function VerdictPill({ level }: { level: VerdictLevel }) {
  const { label, tone, icon: Icon } = VERDICTS[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2.5 text-headline transition-colors',
        TONE_PILL_CLASSES[tone],
      )}
    >
      <span aria-hidden className="relative size-[18px] shrink-0">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={level}
            initial={{ opacity: 0, scale: 0.5, rotate: -60 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 60 }}
            className="absolute inset-0"
          >
            <Icon className="size-full" />
          </motion.span>
        </AnimatePresence>
      </span>
      <AnimatedText value={label} />
    </span>
  );
}
