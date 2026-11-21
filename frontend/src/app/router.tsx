import { createBrowserRouter } from 'react-router';

import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { RouteErrorPage } from '@/features/errors/RouteErrorPage';
import { PlannerPage } from '@/features/planner/PlannerPage';
import { SharePage } from '@/features/share/SharePage';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <PlannerPage /> },
      { path: 'plan/:planId', element: <SharePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
