import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense, type JSX } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/clerk-react';
// Landing is kept eager — it's the entry point for all unauthenticated users
import LandingPage from './pages/Landing';
import AuthLayout from './components/AuthLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store';

// Lazy-load everything behind auth — none of it matters for the landing page
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const CreatePage      = lazy(() => import('./pages/Create'));
const BatchResultPage = lazy(() => import('./pages/BatchResult'));
const ResultPage      = lazy(() => import('./pages/Result'));
const BrandSettings   = lazy(() => import('./pages/Brand'));
const LibraryPage     = lazy(() => import('./pages/Library'));
const CalendarPage    = lazy(() => import('./pages/Calendar'));
const IdeatePage      = lazy(() => import('./pages/Ideate'));
const RepurposePage   = lazy(() => import('./pages/Repurpose'));
const CompetitorPage  = lazy(() => import('./pages/Competitor'));

// WHY: key by jobId so navigating job A → B remounts Result and drops A's slide/state.
function KeyedResultPage(): JSX.Element {
  const { jobId } = useParams<{ jobId: string }>();
  return <ResultPage key={jobId} />;
}

const RouteSpinner = () => (
  <div role="status" aria-label="Loading" style={{ minHeight: '100vh', background: 'var(--color-dark-900)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 32, height: 32, border: '3px solid var(--accent-2)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// SECURITY: (SEC-018): never ship a production bundle aimed at a shared
// pk_test_ Clerk instance. Local DEV may use the documented fallback so
// `npm run dev` still works without a client .env; PROD must set the env var.
const DEV_CLERK_FALLBACK = 'pk_test_YWRhcHRlZC1wdW1hLTY3LmNsZXJrLmFjY291bnRzLmRldiQ';
const envClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
if (import.meta.env.PROD && !envClerkKey) {
  throw new Error(
    'VITE_CLERK_PUBLISHABLE_KEY is required in production builds. ' +
    'Set it in the Vercel (or host) environment before deploying.',
  );
}
if (!envClerkKey && import.meta.env.DEV) {
  console.warn(
    'VITE_CLERK_PUBLISHABLE_KEY is not set — using the shared local-dev Clerk instance.',
  );
}
const PUBLISHABLE_KEY = envClerkKey || DEV_CLERK_FALLBACK;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

// SECURITY: queryClient is module-level and survives sign-out/sign-in, so the next
// user on the same tab would see the previous user's cached API data. Clear it
// whenever the Clerk userId changes (including to null on sign-out).
function UserScopeSync(): null {
  const { isLoaded, userId } = useAuth();
  const prevUserId = useRef<string | null | undefined>(undefined);
  const setActiveUser = useAppStore((s) => s.setActiveUser);
  const resetUserScopedState = useAppStore((s) => s.resetUserScopedState);

  useEffect(() => {
    // WHY: wait for isLoaded: userId is undefined while Clerk boots, not signed-out
    if (!isLoaded) return;
    const current = userId ?? null;
    // WHY: skip first run: nothing cached yet, and clearing would be a no-op
    if (prevUserId.current !== undefined && prevUserId.current !== current) {
      queryClient.clear();
      resetUserScopedState();
    }
    prevUserId.current = current;
    setActiveUser(current);
  }, [isLoaded, userId, setActiveUser, resetUserScopedState]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);
  return null;
}

// WHY: auth-aware catch-all: signed-in users hitting a typo URL used to land on
// the public marketing page; send them to /dashboard instead (guests still → /).
function RedirectUnknown() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <RouteSpinner />;
  return <Navigate to={isSignedIn ? '/dashboard' : '/'} replace />;
}

function ClerkProviderWithRoutes() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY} 
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <UserScopeSync />
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-up/*" element={<div style={{ minHeight: '100vh', background: 'var(--color-dark-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" /></div>} />
        <Route path="/sign-in/*" element={<div style={{ minHeight: '100vh', background: 'var(--color-dark-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" /></div>} />

        {/* Authenticated routes — lazy-loaded, Suspense handles the loading state */}
        <Route element={
          <ErrorBoundary>
            <Suspense fallback={<RouteSpinner />}>
              <AuthLayout />
            </Suspense>
          </ErrorBoundary>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/batch-result" element={<BatchResultPage />} />
          <Route path="/result/:jobId" element={<KeyedResultPage />} />
          <Route path="/brand" element={<BrandSettings />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/history" element={<Navigate to="/library" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/ideate" element={<IdeatePage />} />
          <Route path="/repurpose" element={<RepurposePage />} />
          <Route path="/competitor" element={<CompetitorPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<RedirectUnknown />} />
      </Routes>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkProviderWithRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
