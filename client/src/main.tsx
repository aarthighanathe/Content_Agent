import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

// WHY minimal interface: only the subset of the posthog-js API actually called from this
// codebase (Create.tsx's posthog.capture, plus init/identify/reset used here) — not a full
// SDK typing, just enough to keep the shim and the real module-loaded instance compatible.
interface PosthogClient {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (id?: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  init: (key: string, config?: Record<string, unknown>) => void;
}

// No-op shim used synchronously; replaced by real posthog instance after dynamic import resolves
// Dynamic import removes posthog-js (62 KB gz) from the mandatory initial bundle
export let posthog: PosthogClient = {
  capture: () => {},
  identify: () => {},
  reset: () => {},
  init: () => {},
};

if (POSTHOG_KEY) {
  import('posthog-js').then((mod) => {
    posthog = mod.default;
    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      autocapture: false,
      loaded: () => console.info('✓ PostHog analytics initialized'),
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
