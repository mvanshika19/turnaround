import { cn } from '@/lib/cn';

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-footnote text-label-secondary', className)}>
      A planning aid, not a guarantee. Check conditions and leave a trip plan with someone.{' '}
      <a
        href="https://www.adventuresmart.ca/"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm text-accent underline-offset-2 hover:underline"
      >
        AdventureSmart trip plans
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
