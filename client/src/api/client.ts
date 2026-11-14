import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// WHY: minimal shape (not @clerk/clerk-js types): Clerk attaches itself to `window` at
// runtime; we only ever call this one method here, so a narrow structural type avoids
// `any` without pulling in the full SDK's global type augmentation.
interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken?: () => Promise<string | null>;
    };
  };
}

function isClerkWindow(w: unknown): w is ClerkWindow {
  return typeof w === 'object' && w !== null;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  // WHY: credentials: social OAuth /connect sets an HttpOnly CSRF cookie on the
  // API origin that /callback must read — cross-origin Vercel→Render needs this.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// WHY: interceptor: Clerk tokens expire and must be freshly fetched per request.
// Using an interceptor means no auth logic is scattered across individual API calls —
// every axios request through this instance automatically gets a valid Bearer token.
api.interceptors.request.use(async (config) => {
  try {
    const win: ClerkWindow = isClerkWindow(window) ? window : {};
    const token = await win.Clerk?.session?.getToken?.();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Clerk not ready yet
  }
  return config;
});

export { api, API_BASE };
