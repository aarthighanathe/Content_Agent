import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
// Landing is kept eager — it's the entry point for all unauthenticated users
import LandingPage from './pages/Landing';
import AuthLayout from './components/AuthLayout';

// Lazy-load everything behind auth — none of it matters for the landing page
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const CreatePage      = lazy(() => import('./pages/Create'));
const ResultPage      = lazy(() => import('./pages/Result'));
const BrandSettings   = lazy(() => import('./pages/Brand'));
const LibraryPage     = lazy(() => import('./pages/Library'));
const CalendarPage    = lazy(() => import('./pages/Calendar'));
const BatchResultPage = lazy(() => import('./pages/BatchResult'));
const IdeatePage      = lazy(() => import('./pages/Ideate'));
const RepurposePage   = lazy(() => import('./pages/Repurpose'));
const CompetitorPage  = lazy(() => import('./pages/Competitor'));

const RouteSpinner = () => (
  <div role="status" aria-label="Loading" style={{ minHeight: '100vh', background: 'var(--color-dark-900)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #A855F7',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_YWRhcHRlZC1wdW1hLTY3LmNsZXJrLmFjY291bnRzLmRldiQ';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);
  return null;
}

function ClerkProviderWithRoutes() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY} 
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-up/*" element={<div style={{ minHeight: '100vh', background: 'var(--color-dark-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" /></div>} />
        <Route path="/sign-in/*" element={<div style={{ minHeight: '100vh', background: 'var(--color-dark-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" /></div>} />

        {/* Authenticated routes — lazy-loaded, Suspense handles the loading state */}
        <Route element={
          <Suspense fallback={<RouteSpinner />}>
            <AuthLayout />
          </Suspense>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/result/:jobId" element={<ResultPage />} />
          <Route path="/brand" element={<BrandSettings />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/history" element={<Navigate to="/library" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/batch" element={<BatchResultPage />} />
          <Route path="/ideate" element={<IdeatePage />} />
          <Route path="/repurpose" element={<RepurposePage />} />
          <Route path="/competitor" element={<CompetitorPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
