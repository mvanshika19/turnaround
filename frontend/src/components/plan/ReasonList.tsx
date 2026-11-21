import type { Reason } from '@/api/types';
import { cn } from '@/lib/cn';
import { reasonIcon, VERDICTS } from '@/lib/status';
import { TONE_TEXT_CLASSES } from '@/lib/tone';

interface ReasonListProps {
  reasons: readonly Reason[];
  className?: string;
}

/** The plain-language reasons behind a verdict, each with an icon in its level's colour. */
export function ReasonList({ reasons, className }: ReasonListProps) {
  return (
    <ul aria-label="Reasons" className={cn('flex flex-col gap-3', className)}>
      {reasons.map((reason) => {
        const Icon = reasonIcon(reason.code);
        return (
          <li key={reason.code} className="flex gap-3">
            <Icon
              aria-hidden
              className={cn(
                'mt-0.5 size-4 shrink-0 transition-colors',
                TONE_TEXT_CLASSES[VERDICTS[reason.level].tone],
              )}
            />
            <span className="text-callout">{reason.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
