import { TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

import { NotFoundPage } from './NotFoundPage';

/** Shown in place of any page that failed to render. */
export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  useDocumentTitle(notFound ? 'Page not found' : 'Something went wrong');

  if (notFound) return <NotFoundPage />;

  return (
    <PageLayout align="center">
      <StatusMessage
        headingLevel="h1"
        alert
        icon={TriangleAlert}
        title="Something went wrong"
        message="The page hit a problem it couldn’t recover from. Reloading usually fixes it."
        action={
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </Button>
        }
      />
    </PageLayout>
  );
}
