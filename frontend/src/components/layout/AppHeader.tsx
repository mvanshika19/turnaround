import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface AppHeaderProps {
  /** Page actions shown after the theme toggle, e.g. the planner's Share button. */
  actions?: ReactNode;
  className?: string;
}

/** The frosted 56 px bar across the top of every page. */
export function AppHeader({ actions, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'material z-20 flex h-14 items-center justify-between gap-3 border-b-[0.5px] border-separator px-4 transition-colors lg:px-6',
        className,
      )}
    >
      {/* With page actions, the wordmark makes way for them on narrow phones. */}
      <Logo compact={actions !== undefined} />
      <div className="flex items-center gap-2 lg:gap-3">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
