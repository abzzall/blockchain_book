/**
 * The root of the application, and the three providers the rest of it needs.
 *
 * A React component can only use a hook if some ancestor supplies what that
 * hook reads. Both libraries here work that way, so both wrappers go at the
 * very top, once, and never again:
 *
 *   WagmiProvider          supplies the chain configuration and the wallet
 *                          connection. Every useAccount, useReadContract and
 *                          useWriteContract below reads from it.
 *
 *   QueryClientProvider    supplies the cache. wagmi's read hooks are built on
 *                          React Query, and this is the object that remembers
 *                          what was read. Without it the read hooks throw.
 *
 *   ErrorBoundary          catches a render-time exception anywhere beneath it
 *                          and shows a page instead of a blank screen. React
 *                          unmounts the whole tree on an uncaught render error,
 *                          which is what produces the "white page" a user
 *                          reports as the site being down.
 *
 * The QueryClient is created once, outside the component. Creating it inside
 * would make a new cache on every render, which silently discards everything
 * read so far -- a real and common cause of "the data keeps disappearing".
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config.js';
import { App } from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A failed read is retried twice before it is reported. A dropped
      // connection often recovers on its own, and retrying silently is kinder
      // than showing an error the user can do nothing about.
      retry: 2,
      // Chain data goes stale the moment a block arrives. Ten seconds is a
      // compromise: fresh enough to be useful, slow enough not to hammer a
      // public endpoint.
      staleTime: 10_000,
      // Re-read when the tab regains focus: the user was away, blocks arrived.
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </StrictMode>,
);
