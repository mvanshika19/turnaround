import { RotateCw, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';

import { Button } from './Button';

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
  className?: string;
}

/** An inline failure message with a way to try again. */
export function ErrorCard({ message, onRetry, className }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-start gap-3 rounded-control bg-fill p-4', className)}
    >
      <p className="flex gap-2 text-callout">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-caution-text" />
        {message}
      </p>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCw aria-hidden className="size-4" />
        Try again
      </Button>
    </div>
  );
}
