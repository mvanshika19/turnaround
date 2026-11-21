import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { SPRING } from '@/lib/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { createQueryClient } from './queryClient';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MotionConfig reducedMotion="user" transition={SPRING}>
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
