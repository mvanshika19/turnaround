import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary';

const BASE =
  'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-full px-4 text-callout font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:min-h-9';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-fill text-on-accent hover:bg-accent-fill-hover',
  secondary: 'bg-fill text-label hover:opacity-80',
};

/** Class names shared by `Button` and `ButtonLink`. */
export function buttonClasses(variant: ButtonVariant, className?: string): string {
  return cn(BASE, VARIANTS[variant], className);
}
