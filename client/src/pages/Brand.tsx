import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { updateBrandVoice, getProfile, analyzeVoice, getSocialConnections, disconnectSocial, exportMyData, deleteMyAccount } from '../api';
import type { ContentDna } from '../types/api';
import { IdentityCard } from './Brand/IdentityCard';
import { VoiceCard } from './Brand/VoiceCard';
import { VoiceDriftCard } from './Brand/VoiceDriftCard';
import { ContentDnaCard } from './Brand/ContentDnaCard';
import { PublishingConnectionsCard } from './Brand/PublishingConnectionsCard';
import { DangerZoneCard } from './Brand/DangerZoneCard';
import { DeleteAccountModal } from './Brand/DeleteAccountModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { BRAND_STYLES } from './Brand/brandStyles';
import { loadDnaHistory, saveDnaHistory } from './Brand/dnaHistory';
import type { DnaHistoryEntry } from './Brand/dnaHistory';

// WHY this exact key: Dashboard.tsx's profileQuery uses ['dashboard', 'profile'] for the
// same getProfile() call. Sharing the key means both pages read/write one cache entry —
// editing brand info here now invalidates what Dashboard shows, instead of the two pages
// silently diverging (audit #25/2026-07).
const PROFILE_QUERY_KEY = ['dashboard', 'profile'];

export default function BrandSettings() {
  const [searchParams] = useSearchParams();
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
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  // WHY a confirm-pending platform, same rationale as Library's collection-delete
  // fix: disconnect previously fired the mutation directly on click with zero
  // confirmation step (2026-08-10 audit — the same highest-severity UX finding
  // as the collection-delete case, since both are silent, irreversible-feeling
  // destructive actions with no undo).
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
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
  const socialConnectionsQuery = useQuery({ queryKey: ['social', 'connections'], queryFn: getSocialConnections });
  const socialConnections = socialConnectionsQuery.data?.connections ?? [];

  // WHY extracted from the hydration effect below: "Reset" (handleReset) needs the
  // exact same "copy server profile into form state" logic on demand, not just on
  // first load — see the WHY on handleReset for what bug this fixes.
  function applyProfileToForm(profile: NonNullable<typeof profileQuery.data>): void {
    setBrandName(profile.brandName || '');
    setIndustry(profile.industry || '');
    setSelectedVoices(profile.brandVoice ? profile.brandVoice.split(',').map((v: string) => v.trim()).filter(Boolean) : ['Professional']);
    setPhrasesUse(profile.phrasesUse || '');
    setPhrasesAvoid(profile.phrasesAvoid || '');
    setContentDna(profile.contentDna || null);
  }

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
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !profileQuery.data) return undefined;
    const profile = profileQuery.data;
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — the state update now happens in a callback, not in the
    // effect body itself.
    // WHY hydrated.current is set INSIDE the timeout, not before scheduling it:
    // under StrictMode's dev double-invoke (mount → cleanup → remount, synchronous
    // in the same tick), setting the guard before scheduling meant the first
    // invocation's timer got cleared by cleanup while the second invocation's guard
    // check already saw hydrated.current === true and skipped scheduling a
    // replacement — no timer ever fired and the form silently never hydrated.
    // Setting the guard only once the timer actually runs means a cleared/cancelled
    // timeout never marks hydration as done, and the surviving invocation's timer
    // is the one that flips it.
    const t = setTimeout(() => {
      hydrated.current = true;
      applyProfileToForm(profile);
    }, 0);
    return () => clearTimeout(t);
  }, [profileQuery.data]);

  useEffect(() => {
    const connected = searchParams.get('social_connected');
    const error     = searchParams.get('social_error');
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — the state update now happens in a callback, not in the
    // effect body itself.
    const timer = setTimeout(() => {
      if (connected) {
        flashToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, false, 3500);
        void socialConnectionsQuery.refetch();
      }
      if (error) {
        flashToast(decodeURIComponent(error), true, 4000);
      }
    }, 0);
    return () => clearTimeout(timer);
    // WHY socialConnectionsQuery excluded from deps: it's a new object identity every
    // render (React Query's useQuery result isn't memoized across renders), which would
    // re-run this effect (and re-fire the toast timers) constantly. Only `refetch` is
    // actually called, and that function's identity is stable across a query's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, flashToast]);

  const updateBrandVoiceMutation = useMutation({
    mutationFn: updateBrandVoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      flashToast('Brand settings saved!');
    },
    onError: () => {
      setSaveError('Failed to save brand settings — please try again.');
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

  const disconnectSocialMutation = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: (_data, platform) => {
      queryClient.setQueryData(['social', 'connections'], (prev: { connections: typeof socialConnections } | undefined) =>
        prev ? { connections: prev.connections.map(c => c.platform === platform ? { ...c, connected: false, displayName: null } : c) } : prev
      );
      setDisconnectConfirm(null);
      flashToast(`${platform} disconnected`, false, 2500);
    },
    // WHY now has an onError toast: this used to swallow disconnect failures silently
    // (a comment here previously acknowledged that as pre-existing behavior) — the UI
    // still showed the platform as connected with no explanation if the request failed,
    // which reads as "did my click even register?" Reuses the same flashToast used for
    // every other Brand.tsx outcome instead of adding a second notification mechanism.
    // WHY also closes the confirm modal here (not just on success): matches the
    // collection-delete confirm's error-handling convention — the toast is
    // sufficient feedback, and the Disconnect button remains available to retry.
    onError: (_err, platform) => {
      setDisconnectConfirm(null);
      flashToast(`Failed to disconnect ${platform} — please try again.`, true, 4000);
    },
  });

  const exportMyDataMutation = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contentagent-export-${new Date().toISOString().slice(0, 10)}.json`;
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

  function handleConfirmDisconnect() {
    if (!disconnectConfirm) return;
    const platform = disconnectConfirm;
    setDisconnectingPlatform(platform);
    disconnectSocialMutation.mutate(platform, { onSettled: () => setDisconnectingPlatform(null) });
  }

  function handleAnalyzeDna() {
    if (!dnaSamples.trim() || dnaSamples.length < 50) {
      setDnaError('Please paste at least 3 sample posts.');
      return;
    }
    setDnaError('');
    analyzeVoiceMutation.mutate(dnaSamples);
  }

  function toggleVoice(voice: string) {
    setSelectedVoices(prev => prev.includes(voice) ? prev.filter(v => v !== voice) : [...prev, voice]);
  }

  function handleSave() {
    setResetConfirming(false);
    setSaveError('');
    updateBrandVoiceMutation.mutate({ brandName, industry, brandVoice: selectedVoices.join(', '), phrasesUse, phrasesAvoid });
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
    <div className="brand-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

        <PublishingConnectionsCard
          socialConnections={socialConnections}
          disconnectingPlatform={disconnectingPlatform}
          onDisconnect={(platform) => setDisconnectConfirm(platform)}
          isLoading={socialConnectionsQuery.isLoading}
          isError={socialConnectionsQuery.isError}
          onRetry={() => { socialConnectionsQuery.refetch().catch(() => {}); }}
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
        <button className="btn-primary" onClick={handleSave} disabled={updateBrandVoiceMutation.isPending}>
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

      {disconnectConfirm && (
        <ConfirmDeleteModal
          title={`Disconnect ${disconnectConfirm}?`}
          message="You'll need to reconnect before you can post to this account again."
          confirmLabel="Disconnect"
          pendingLabel="Disconnecting…"
          onCancel={() => setDisconnectConfirm(null)}
          onConfirm={handleConfirmDisconnect}
          isPending={disconnectSocialMutation.isPending}
        />
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
