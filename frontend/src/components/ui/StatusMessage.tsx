import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface StatusMessageProps {
  icon: LucideIcon;
  title: string;
  message: string;
  /** A button or link that gets the hiker moving again, e.g. "Try again" or "Plan a hike". */
  action?: ReactNode;
  /** `h1` when the message is the whole page, `h2` when it fills a panel. */
  headingLevel?: 'h1' | 'h2';
  /** Announce the message as soon as it appears (for failures that replace content). */
  alert?: boolean;
  className?: string;
}

/** A calm, centred message that stands in for content: not found, unreachable, failed. */
export function StatusMessage({
  icon: Icon,
  title,
  message,
  action,
  headingLevel: Heading = 'h2',
  alert = false,
  className,
}: StatusMessageProps) {
  return (
    <div
      role={alert ? 'alert' : undefined}
      className={cn('flex flex-col items-center gap-3 text-center', className)}
    >
      <span className="grid size-12 place-items-center rounded-full bg-fill transition-colors">
        <Icon aria-hidden className="size-6 text-label" />
      </span>
      <div className="flex flex-col gap-1">
        <Heading className="text-headline">{title}</Heading>
        <p className="max-w-xs text-callout text-label-secondary">{message}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
