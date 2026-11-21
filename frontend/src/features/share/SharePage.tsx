import { CalendarX2, TriangleAlert, Unplug } from 'lucide-react';
import { useParams } from 'react-router';

import {
  errorMessage,
  isNotFoundError,
  isUnreachableError,
  UNREACHABLE_HINT,
  UNREACHABLE_TITLE,
} from '@/api/client';
import { usePlanById } from '@/api/queries';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

import { SharedPlanCard, SharedPlanSkeleton } from './SharedPlanCard';

/** `/plan/:planId`: a shared plan, read-only. */
export function SharePage() {
  const { planId } = useParams();
  const plan = usePlanById(planId);
  useDocumentTitle(plan.data ? `${plan.data.trail.name} plan` : 'Shared plan');

  if (plan.data) {
    return (
      <PageLayout>
        <SharedPlanCard plan={plan.data} />
      </PageLayout>
    );
  }

  if (plan.error) {
    return (
      <PageLayout align="center">
        <SharePageError
          error={plan.error}
          onRetry={() => {
            void plan.refetch();
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SharedPlanSkeleton />
    </PageLayout>
  );
}

function SharePageError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (isNotFoundError(error)) {
    return (
      <StatusMessage
        headingLevel="h1"
        icon={CalendarX2}
        title="This plan isn’t available"
        message="Plans are kept for a limited time."
        action={<ButtonLink to="/">Plan a hike</ButtonLink>}
      />
    );
  }

  const unreachable = isUnreachableError(error);
  return (
    <StatusMessage
      headingLevel="h1"
      alert
      icon={unreachable ? Unplug : TriangleAlert}
      title={unreachable ? UNREACHABLE_TITLE : 'This plan couldn’t load'}
      message={unreachable ? UNREACHABLE_HINT : errorMessage(error)}
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}
