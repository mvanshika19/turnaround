import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { AppHeader } from './AppHeader';

interface PageLayoutProps {
  /** `center` for short messages such as "not found"; `start` for content that can grow. */
  align?: 'center' | 'start';
  children: ReactNode;
}

/** The header above a single centred column, for the share page and the error pages. */
export function PageLayout({ align = 'start', children }: PageLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader className="sticky top-0" />
      <main
        className={cn(
          'flex flex-1 flex-col items-center px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pt-10',
          align === 'center' && 'justify-center',
        )}
      >
        {children}
      </main>
    </div>
  );
}
