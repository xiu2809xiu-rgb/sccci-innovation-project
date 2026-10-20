import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { bootstrap } from './app/bootstrap';
import { AppProviders } from './app/providers/app-providers';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html');
}

const { dependencies, router } = bootstrap();

createRoot(container).render(
  <StrictMode>
    <AppProviders dependencies={dependencies}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
