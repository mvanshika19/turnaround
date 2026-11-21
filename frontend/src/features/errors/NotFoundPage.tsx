import { Signpost } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { ButtonLink } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <PageLayout align="center">
      <StatusMessage
        headingLevel="h1"
        icon={Signpost}
        title="This page doesn’t exist"
        message="Check the link, or start a new plan."
        action={<ButtonLink to="/">Plan a hike</ButtonLink>}
      />
    </PageLayout>
  );
}
