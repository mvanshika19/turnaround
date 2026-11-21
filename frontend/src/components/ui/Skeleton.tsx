import { cn } from '@/lib/cn';

/** A shimmering placeholder block. Size it with class names. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-control', className)} />;
}
