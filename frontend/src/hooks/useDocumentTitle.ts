import { useEffect } from 'react';

const APP_NAME = 'Turnaround';

/** Sets the browser tab title: "Lynn Peak plan · Turnaround", or just "Turnaround". */
export function useDocumentTitle(pageTitle?: string): void {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
  }, [pageTitle]);
}
