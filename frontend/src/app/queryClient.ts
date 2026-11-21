import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

/** Retry once, except for client errors (404, 422), which will not succeed on a second try. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.isClientError) return false;
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  });
}
