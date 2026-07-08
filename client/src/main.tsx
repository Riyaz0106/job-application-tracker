import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import App from './App';
import { trpc } from './trpc';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

// Created once when this module loads (single-page client app, no SSR).
// QueryClient is React Query's cache; trpcClient knows how to reach the API.
const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  // Relative URL → the browser hits the Vite dev origin, which proxies /api/* to
  // the Express server (see client/vite.config.ts). httpBatchLink also coalesces
  // calls made in the same tick into a single HTTP request.
  links: [httpBatchLink({ url: '/api/trpc' })],
});

createRoot(rootElement).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
