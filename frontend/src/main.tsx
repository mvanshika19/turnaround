import '@fontsource-variable/inter';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from './app/providers';
import { router } from './app/router';

const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing the #root element.');

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
