import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-sm text-accent underline-offset-2 hover:underline"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** The safety note and the data credits that the trail data's licence requires. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 text-footnote text-label-secondary', className)}>
      <p>
        A planning aid, not a guarantee. Check conditions and leave a trip plan with someone.{' '}
        <ExternalLink href="https://www.adventuresmart.ca/">AdventureSmart trip plans</ExternalLink>
      </p>
      <p>
        Trail data: District of North Vancouver,{' '}
        <ExternalLink href="https://geoweb.dnv.org/data/index.php">
          Open Government Licence – North Vancouver
        </ExternalLink>
        . Forecast: Open-Meteo.
      </p>
    </div>
  );
}
