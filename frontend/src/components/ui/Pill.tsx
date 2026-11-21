import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/status';
import { TONE_PILL_CLASSES } from '@/lib/tone';

interface PillProps {
  tone?: Tone;
  /** `outline` is a quiet hairline badge for metadata such as "Sample data"; it ignores `tone`. */
  variant?: 'tinted' | 'outline';
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

/** A small caption badge: tone text on a 14% tint of the tone colour, or a hairline outline. */
export function Pill({
  tone = 'neutral',
  variant = 'tinted',
  icon: Icon,
  className,
  children,
}: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption whitespace-nowrap transition-colors',
        variant === 'outline'
          ? 'border border-separator text-label-secondary'
          : TONE_PILL_CLASSES[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
