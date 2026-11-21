import { useId } from 'react';
import type { ReactNode } from 'react';

interface ControlSectionProps {
  title: string;
  /** Shown at the end of the title row, e.g. the chosen date or the start-time readout. */
  aside?: ReactNode;
  children: ReactNode;
}

/** One titled group in the "Plan your hike" panel. */
export function ControlSection({ title, aside, children }: ControlSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex min-h-[22px] items-baseline justify-between gap-3">
        <h3 id={headingId} className="text-footnote text-label-secondary">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
