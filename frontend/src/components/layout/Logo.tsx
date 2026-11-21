import { Link } from 'react-router';

import { cn } from '@/lib/cn';

/** The brand mark: a U-turn arrow on a rounded tile. It inverts in dark mode via the tokens. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="7" className="fill-label transition-colors" />
      <g
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-surface transition-colors"
      >
        <path d="M9 24V13a5 5 0 0 1 10 0v10" />
        <path d="M14.5 18.5 19 23l4.5-4.5" />
      </g>
    </svg>
  );
}

/** Mark and wordmark, linking home. `compact` keeps only the mark on narrow phones. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-h-11 items-center gap-2 rounded-control">
      <LogoMark className="size-7" />
      <span className={cn('text-headline', compact && 'max-sm:sr-only')}>Turnaround</span>
    </Link>
  );
}
