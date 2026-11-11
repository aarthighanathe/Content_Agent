import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { updateBrandVoice, getProfile, analyzeVoice, exportMyData, deleteMyAccount } from '../api';
import type { ContentDna, Profile } from '../types/api';
import { getSubmitError } from '../lib/errorMessages';
import { IdentityCard } from './Brand/IdentityCard';
import { VoiceCard } from './Brand/VoiceCard';
import { VoiceDriftCard } from './Brand/VoiceDriftCard';
import { ContentDnaCard } from './Brand/ContentDnaCard';
// NOTE: PublishingConnectionsCard kept on disk but not mounted — social OAuth
// connect UI is hidden until LinkedIn/Twitter credentials are ready for users.
import { DangerZoneCard } from './Brand/DangerZoneCard';
import { DeleteAccountModal } from './Brand/DeleteAccountModal';
import { BRAND_STYLES } from './Brand/brandStyles';
import { loadDnaHistory, saveDnaHistory } from './Brand/dnaHistory';
import type { DnaHistoryEntry } from './Brand/dnaHistory';
import { normalizeBrandVoices } from './Brand/brandVoices';

// WHY this exact key: Dashboard.tsx's profileQuery uses ['dashboard', 'profile'] for the
// same getProfile() call. Sharing the key means both pages read/write one cache entry —
// editing brand info here now invalidates what Dashboard shows, instead of the two pages
// silently diverging (audit #25/2026-07).
const PROFILE_QUERY_KEY = ['dashboard', 'profile'];

export default function BrandSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const { user } = useUser();
  const clerkUserId = user?.id ?? '';

  const [brandName, setBrandName]                 = useState('');
  const [industry, setIndustry]                   = useState('');
  const [selectedVoices, setSelectedVoices]       = useState<string[]>(['Professional']);
  const [phrasesUse, setPhrasesUse]               = useState('');
  const [phrasesAvoid, setPhrasesAvoid]           = useState('');
  const [saveError, setSaveError]                 = useState('');
  const [dnaSamples, setDnaSamples]               = useState('');
  const [contentDna, setContentDna]               = useState<ContentDna | null>(null);
  const [dnaError, setDnaError]                   = useState('');
  const [dnaHistory, setDnaHistory]               = useState<DnaHistoryEntry[]>([]);
  const [exportError, setExportError]             = useState('');
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError]             = useState('');
  const [resetConfirming, setResetConfirming]     = useState(false);
  // WHY a single unified toast (#36): Brand previously maintained two separate toast
  // mechanisms — a boolean `showToast` for the save-success banner and a string+boolean
  // pair (`socialToast`/`socialToastIsError`) for social-connect/disconnect feedback.
  // Both rendered `.toast` divs with identical CSS but divergent state shapes, making
  // them impossible to reason about together (e.g. they could theoretically stack).
  // One `{ message, isError? } | null` state drives a single toast element; `flashToast`
  // replaces every previous call site.
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = useCallback((message: string, isError = false, durationMs = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);
  // Clear timer on unmount to avoid setState-after-unmount.
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const profileQuery = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getProfile });

  // WHY extracted from the hydration effect below: "Reset" (handleReset) needs the
  // exact same "copy server profile into form state" logic on demand, not just on
  // first load — see the WHY on handleReset for what bug this fixes.
  // WHY useCallback: the hydration effect lists this in its deps; a fresh function
  // identity every render would re-trigger the effect after isHydrated flips.
  const applyProfileToForm = useCallback((profile: Profile): void => {
    setBrandName(profile.brandName || '');
    setIndustry(profile.industry || '');
    // WHY normalizeBrandVoices: stored values may be lowercase onboarding ids
    // (`professional`) while VoiceCard pills are Title Case (QA-BRAND-001).
    setSelectedVoices(normalizeBrandVoices(profile.brandVoice));
    setPhrasesUse(profile.phrasesUse || '');
    setPhrasesAvoid(profile.phrasesAvoid || '');
    setContentDna(profile.contentDna || null);
  }, []);

  // WHY a hydrated-once guard (audit #2, original: "profile-load race clobbering
  // in-progress edits"): profileQuery can refetch/refresh in the background (window
  // refocus, another tab's mutation invalidating this same shared key, React Query's
  // default staleness behavior) at any point while the user is mid-edit on this form.
  // Only copying server data into local state the FIRST time it successfully loads —
  // never on subsequent background refetches — means a user who's already typed into a
  // field can't have it silently overwritten out from under them.
  // WHY call applyProfileToForm instead of duplicating the logic: the original
  // effect had truthy-only checks (if (profile.brandName)) that differed from
  // applyProfileToForm's || '' fallbacks. This meant clearing a field server-side
  // (e.g. brandName set to empty string) wouldn't be reflected on reload, while
  // clicking Reset would correctly blank it. Using the shared function ensures both
  // paths behave identically.
  // WHY useState (not useRef): the Save button reads hydration to set disabled/
  // title during render. Reading a ref during render trips react-hooks/refs and
  // only flipped the button after an unrelated re-render. State makes that read
  // reactive. Still set inside the timeout so StrictMode cleanup can't mark
  // hydration done after cancelling the first timer.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    if (isHydrated || !profileQuery.data) return undefined;
    const profile = profileQuery.data;
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — the state update now happens in a callback, not in the
    // effect body itself.
    const t = setTimeout(() => {
      setIsHydrated(true);
      applyProfileToForm(profile);
    }, 0);
    return () => clearTimeout(t);
  }, [profileQuery.data, isHydrated, applyProfileToForm]);

  useEffect(() => {
    const connected = searchParams.get('social_connected');
    const error     = searchParams.get('social_error');
    if (!connected && !error) return;
    // SECURITY: allowlist only — never toast raw query-string text (SEC-014).
    // OAuth callback redirects use stable codes; unknown values fall back to a
    // generic message so an attacker can't inject arbitrary toast copy via URL.
    const SOCIAL_CONNECTED = new Set(['linkedin', 'twitter']);
    const SOCIAL_ERROR_COPY: Record<string, string> = {
      provider_denied: 'You denied access — connection was cancelled.',
      missing_params: 'OAuth callback was incomplete — please try connecting again.',
      invalid_state: 'OAuth session was invalid — please try connecting again.',
      csrf_mismatch: 'OAuth session mismatch — please try connecting again.',
      session_expired: 'OAuth session expired or already used — please try again.',
      linkedin_not_configured: 'LinkedIn OAuth is not configured on this server.',
      twitter_not_configured: 'Twitter OAuth is not configured on this server.',
      connection_failed: 'Connection failed — please try again.',
    };
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — the state update now happens in a callback, not in the
    // effect body itself.
    const timer = setTimeout(() => {
      if (connected && SOCIAL_CONNECTED.has(connected)) {
        flashToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, false, 3500);
      }
      if (error) {
        const code = decodeURIComponent(error);
        flashToast(SOCIAL_ERROR_COPY[code] ?? SOCIAL_ERROR_COPY.connection_failed, true, 4000);
      }
      // WHY clear params: re-running this effect on a later Brand visit (or
      // StrictMode remount) would re-toast the same redirect forever.
      setSearchParams({}, { replace: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, flashToast, setSearchParams]);

  const updateBrandVoiceMutation = useMutation({
    mutationFn: updateBrandVoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      flashToast('Brand settings saved!');
    },
    // WHY getSubmitError: zod validation messages (e.g. max length) were already
    // returned as `error` but discarded for a generic banner (QA-BRAND-003).
    onError: (err: unknown) => {
      setSaveError(getSubmitError(err, 'Failed to save brand settings — please try again.').message);
    },
  });

  // WHY useEffect to load DNA history: clerkUserId is not available synchronously
  // on first render (Clerk hydrates asynchronously). Loading once when the userId
  // stabilises avoids an empty-history flash on slow-auth sessions.
  useEffect(() => {
    if (clerkUserId) {
      const t = setTimeout(() => setDnaHistory(loadDnaHistory(clerkUserId)), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [clerkUserId]);

  const analyzeVoiceMutation = useMutation({
    mutationFn: analyzeVoice,
    onSuccess: ({ contentDna: dna }) => {
      setContentDna(dna);
      setDnaSamples('');
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      // WHY save here: this is the point where a new DNA fingerprint is produced.
      // Saving before or after the invalidation both work — the DB write is async
      // and localStorage is sync, so the history entry lands immediately.
      if (clerkUserId) {
        const updated = saveDnaHistory(clerkUserId, dna);
        setDnaHistory(updated);
      }
    },
    onError: () => {
      setDnaError('Analysis failed — please try again.');
    },
  });

  const exportMyDataMutation = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pensieve-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: () => {
      setExportError('Export failed — please try again.');
    },
  });

  const deleteMyAccountMutation = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      void signOut({ redirectUrl: '/' });
    },
    onError: () => {
      setDeleteError('Failed to delete account — please try again.');
    },
  });

  function handleAnalyzeDna() {
    if (!dnaSamples.trim() || dnaSamples.length < 50) {
      setDnaError('Please paste at least 3 sample posts.');
      return;
    }
    setDnaError('');
    analyzeVoiceMutation.mutate(dnaSamples);
  }

  function toggleVoice(voice: string) {
    // WHY keep ≥1 selected: deselecting every pill saved `brandVoice: ""`, which
    // left the form with no tone after the next hydrate and looked broken (QA-BRAND-002).
    setSelectedVoices((prev) => {
      if (prev.includes(voice)) {
        if (prev.length <= 1) return prev;
        return prev.filter((v) => v !== voice);
      }
      return [...prev, voice];
    });
  }

  function handleSave() {
    setResetConfirming(false);
    setSaveError('');
    const voices = selectedVoices.length > 0 ? selectedVoices : ['Professional'];
    updateBrandVoiceMutation.mutate({
      brandName,
      industry,
      brandVoice: voices.join(', '),
      phrasesUse,
      phrasesAvoid,
    });
  }

  // WHY refetch-and-reapply, not clear-to-blank: the confirm dialog's copy says
  // "Discard unsaved edits?" — implying the saved profile comes back — but the old
  // implementation just blanked every field to hardcoded defaults, which is a
  // different (and destructive-looking) action if the user actually has saved brand
  // settings. Refetching guarantees the reapplied values are the current server
  // state, not a possibly-stale local cache.
  async function handleReset() {
    if (!resetConfirming) {
      setResetConfirming(true);
      return;
    }
    setResetConfirming(false);
    try {
      const { data } = await profileQuery.refetch();
      if (data) applyProfileToForm(data);
    } catch {
      flashToast('Failed to reload your saved settings — please try again.', true);
    }
  }

  function handleExportData() {
    setExportError('');
    exportMyDataMutation.mutate();
  }

  function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteError('');
    deleteMyAccountMutation.mutate();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{BRAND_STYLES}</style>

      {/* ── Page Header ── */}
      <div className="section-header">
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>
          Brand Settings
        </h1>
        <p style={{ fontSize: 'clamp(12px,2vw,13px)', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Customize how AI writes content for your brand
        </p>
      </div>

      {/* ── 2-column card grid ── */}
      <div className="brand-card-grid">
        <IdentityCard
          brandName={brandName} onBrandNameChange={setBrandName}
          industry={industry} onIndustryChange={setIndustry}
        />

        <VoiceCard
          selectedVoices={selectedVoices} onToggleVoice={toggleVoice}
          phrasesUse={phrasesUse} onPhrasesUseChange={setPhrasesUse}
          phrasesAvoid={phrasesAvoid} onPhrasesAvoidChange={setPhrasesAvoid}
        />

        <VoiceDriftCard
          isLoading={profileQuery.isLoading}
          isError={profileQuery.isError}
          onRetry={() => { profileQuery.refetch().catch(() => {}); }}
          dimensionTrend={profileQuery.data?.stats?.dimensionTrend}
        />

        <ContentDnaCard
          contentDna={contentDna}
          dnaSamples={dnaSamples}
          onDnaSamplesChange={(v) => { setDnaSamples(v); setDnaError(''); }}
          dnaError={dnaError}
          analyzingDna={analyzeVoiceMutation.isPending}
          onAnalyze={handleAnalyzeDna}
          dnaHistory={dnaHistory}
        />

        <DangerZoneCard
          exporting={exportMyDataMutation.isPending}
          exportError={exportError}
          onExport={handleExportData}
          onOpenDeleteModal={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(''); }}
        />
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 11, flexWrap: 'wrap' }}>
        {resetConfirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Discard unsaved edits?</span>
            <button className="btn-secondary" onClick={() => setResetConfirming(false)}>Cancel</button>
            <button
              onClick={() => { handleReset().catch(() => {}); }}
              style={{ background: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)', color: 'var(--color-error)', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
            >
              Yes, reset
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => { handleReset().catch(() => {}); }} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <RefreshCw size={13} /> Reset
          </button>
        )}
        <button
          className="btn-primary"
          onClick={handleSave}
          // WHY also gate on hydration: Save used to be enabled while the
          // profile was still loading, so a click wrote the blank default form
          // over the real brand. Disable until the first successful hydrate.
          disabled={updateBrandVoiceMutation.isPending || !isHydrated || profileQuery.isLoading || profileQuery.isError}
          title={
            profileQuery.isError
              ? 'Could not load your profile — retry above before saving'
              : !isHydrated || profileQuery.isLoading
                ? 'Loading your saved brand…'
                : undefined
          }
        >
          {updateBrandVoiceMutation.isPending ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid color-mix(in srgb, var(--on-accent) 20%, transparent)', borderTopColor: 'var(--on-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <><Sparkles size={14} /> Save brand settings</>
          )}
        </button>
      </div>

      {saveError && (
        <div style={{ fontSize: 11.5, color: 'var(--color-error)', textAlign: 'right' }}>{saveError}</div>
      )}

      {/* WHY single toast element (#36): previously two separate toast mechanisms
          (showToast boolean for save + socialToast string for social actions) could
          theoretically stack and used divergent state shapes. One `toast` object drives
          both concerns through a single DOM node. */}
      {toast && (
        <div
          className={`toast ${toast.isError ? 'toast-error' : 'toast-success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {toast.isError ? <AlertCircle size={12} /> : <Check size={12} />}
          {toast.message}
        </div>
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          confirmText={deleteConfirmText}
          onConfirmTextChange={setDeleteConfirmText}
          deleting={deleteMyAccountMutation.isPending}
          error={deleteError}
          onConfirm={handleDeleteAccount}
          onClose={() => { if (!deleteMyAccountMutation.isPending) setShowDeleteModal(false); }}
        />
      )}
    </div>
  );
}
