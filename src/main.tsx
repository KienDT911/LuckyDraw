import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { detectCloud } from './shared/cloud';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import './shared/fonts';
import './styles.css';

// Find out right away whether this site has the Cloudflare backend (shared design) or runs locally.
void detectCloud();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
