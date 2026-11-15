import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// WHY: bounded default so a hung Render cold start / LLM call cannot spin the UI forever.
// 60s (not 30s): ideate/competitor/hashtags are synchronous LLM routes. Export overrides it.
const DEFAULT_TIMEOUT_MS = 60_000;
const TOKEN_WAIT_MS = 3_000;
const TOKEN_POLL_MS = 100;

// WHY: minimal shape (not @clerk/clerk-js types): Clerk attaches itself to `window` at
// runtime; we only ever call this one method here, so a narrow structural type avoids
// `any` without pulling in the full SDK's global type augmentation.
interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken?: (opts?: { skipCache?: boolean }) => Promise<string | null>;
    };
  };
}

function isClerkWindow(w: unknown): w is ClerkWindow {
  return typeof w === 'object' && w !== null;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _authRetried?: boolean;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: DEFAULT_TIMEOUT_MS,
  // WHY: credentials: social OAuth /connect sets an HttpOnly CSRF cookie on the
  // API origin that /callback must read — cross-origin Vercel→Render needs this.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function readToken(skipCache: boolean): Promise<string | null> {
  const win: ClerkWindow = isClerkWindow(window) ? window : {};
  const deadline = Date.now() + TOKEN_WAIT_MS;
  // WHY: Clerk loads async — a request fired on first paint used to go out with no
  // Authorization header and 401. Wait briefly for the session instead.
  while (!win.Clerk?.session?.getToken && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, TOKEN_POLL_MS));
  }
  try {
    return (await win.Clerk?.session?.getToken?.({ skipCache })) ?? null;
  } catch {
    return null;
  }
}

// WHY: interceptor: Clerk tokens expire and must be freshly fetched per request.
// Using an interceptor means no auth logic is scattered across individual API calls —
// every axios request through this instance automatically gets a valid Bearer token.
api.interceptors.request.use(async (config) => {
  const token = await readToken(false);
  // SECURITY: every call through this instance is protected — fail locally rather than
  // send it unauthenticated (public demo uses fetch, not this client).
  if (!token) throw new axios.AxiosError('Not authenticated', 'ERR_NOT_AUTHENTICATED', config);
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      throw error;
    }
    const config: RetriableConfig = error.config;
    // WHY: one forced-refresh retry covers a token that expired mid-flight; a second 401
    // means the session is really gone.
    if (!config._authRetried) {
      config._authRetried = true;
      const fresh = await readToken(true);
      if (fresh) {
        config.headers['Authorization'] = `Bearer ${fresh}`;
        return api.request(config);
      }
    }
    if (!window.location.pathname.startsWith('/sign-in')) {
      window.location.assign('/sign-in');
    }
    throw error;
  },
);

export { api, API_BASE };
