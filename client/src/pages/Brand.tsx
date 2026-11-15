import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle } from 'lucide-react';
import { updateBrandVoice, getProfile, analyzeVoice, exportMyData, deleteMyAccount } from '../api';
import type { ContentDna, Profile } from '../types/api';
import { getSubmitError } from '../lib/errorMessages';
import { IdentityCard } from './Brand/IdentityCard';
import { VoiceCard } from './Brand/VoiceCard';
import { VoiceDriftCard } from './Brand/VoiceDriftCard';
import { ContentDnaCard } from './Brand/ContentDnaCard';
import { PublishingConnectionsCard } from './Brand/PublishingConnectionsCard';
import { useBrandSocial } from './Brand/useBrandSocial';
import { DangerZoneCard } from './Brand/DangerZoneCard';
import { DeleteAccountModal } from './Brand/DeleteAccountModal';
import { BrandSaveBar } from './Brand/BrandSaveBar';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { BRAND_STYLES } from './Brand/brandStyles';
import { loadDnaHistory, saveDnaHistory, type DnaHistoryEntry } from './Brand/dnaHistory';
import { normalizeBrandVoices } from './Brand/brandVoices';
import { useBrandAccountReset } from './Brand/useBrandAccountReset';
import { useBrandToast } from './Brand/useBrandToast';
import { downloadJsonExport } from './Brand/downloadExport';

// WHY: share Dashboard's key so Brand edits invalidate the same cache entry.
const PROFILE_QUERY_KEY = ['dashboard', 'profile'];

export default function BrandSettings() {
  const queryClient = useQueryClient();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const clerkUserId = user?.id ?? '';
  // WHY: mutation onSuccess closes over render-time id — a ref keeps the live
  // account so DNA/export success after a switch is ignored.
  const clerkUserIdRef = useRef(clerkUserId);
  clerkUserIdRef.current = clerkUserId;

  // WHY: seed from the React Query cache on the first render. Waiting for an
  // effect (especially setTimeout(0)) painted empty fields, then overwrote them.
  const [cachedProfile] = useState(
    () => queryClient.getQueryData<Profile>(PROFILE_QUERY_KEY),
  );
  const [brandName, setBrandName] = useState(cachedProfile?.brandName || '');
  const [industry, setIndustry] = useState(cachedProfile?.industry || '');
  const [selectedVoices, setSelectedVoices] = useState<string[]>(
    () => normalizeBrandVoices(cachedProfile?.brandVoice),
  );
  const [phrasesUse, setPhrasesUse] = useState(cachedProfile?.phrasesUse || '');
  const [phrasesAvoid, setPhrasesAvoid] = useState(cachedProfile?.phrasesAvoid || '');
  const [saveError, setSaveError]                 = useState('');
  const [dnaSamples, setDnaSamples]               = useState('');
  const [contentDna, setContentDna] = useState<ContentDna | null>(
    cachedProfile?.contentDna ?? null,
  );
  const [dnaError, setDnaError]                   = useState('');
  const [dnaHistory, setDnaHistory]               = useState<DnaHistoryEntry[]>([]);
  const [exportError, setExportError]             = useState('');
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError]             = useState('');
  const [resetConfirming, setResetConfirming]     = useState(false);
  const { toast, flashToast, setToast, toastTimerRef } = useBrandToast();

  const brandSocial = useBrandSocial(flashToast);
  // WHY: gate on Clerk auth (mirrors Dashboard): avoid getProfile before JWT exists.
  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY, queryFn: getProfile, enabled: authLoaded && isSignedIn,
  });

  // WHY: extracted: handleReset needs the same "copy server profile → form" on demand.
  const applyProfileToForm = useCallback((profile: Profile): void => {
    setBrandName(profile.brandName || '');
    setIndustry(profile.industry || '');
    // WHY: normalizeBrandVoices: stored values may be lowercase onboarding ids
    // (`professional`) while VoiceCard pills are Title Case (QA-BRAND-001).
    setSelectedVoices(normalizeBrandVoices(profile.brandVoice));
    setPhrasesUse(profile.phrasesUse || '');
    setPhrasesAvoid(profile.phrasesAvoid || '');
    setContentDna(profile.contentDna || null);
  }, []);

  // WHY: hydrate once. Later refetches must not clobber in-progress edits.
  // Copying during render (not a timeout) means the filled form is what paints.
  const [isHydrated, setIsHydrated] = useState(cachedProfile != null);

  const updateBrandVoiceMutation = useMutation({
    mutationFn: updateBrandVoice,
    // WHY: capture at mutate — invalidate/toast must not apply after an account switch.
    onMutate: (): { mutateUserId: string } => ({ mutateUserId: clerkUserIdRef.current }),
    onSuccess: (_data, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      flashToast('Brand settings saved!');
    },
    // WHY: getSubmitError: zod validation messages (e.g. max length) were already
    // returned as `error` but discarded for a generic banner (QA-BRAND-003).
    onError: (err: unknown, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      setSaveError(getSubmitError(err, 'Failed to save brand settings — please try again.').message);
    },
  });

  // WHY: load after Clerk hydrates — sync first paint would flash empty history.
  useEffect(() => {
    if (clerkUserId) {
      const t = setTimeout(() => setDnaHistory(loadDnaHistory(clerkUserId)), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [clerkUserId]);

  const analyzeVoiceMutation = useMutation({
    mutationFn: analyzeVoice,
    // WHY: capture Clerk id at mutate — onSuccess must not apply DNA to a switched account.
    onMutate: (): { mutateUserId: string } => ({ mutateUserId: clerkUserIdRef.current }),
    onSuccess: ({ contentDna: dna }, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      setContentDna(dna);
      setDnaSamples('');
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      // WHY: save here: this is the point where a new DNA fingerprint is produced.
      // Saving before or after the invalidation both work — the DB write is async
      // and localStorage is sync, so the history entry lands immediately.
      const ownerId = context?.mutateUserId ?? '';
      if (ownerId) {
        const updated = saveDnaHistory(ownerId, dna);
        setDnaHistory(updated);
      }
    },
    onError: (_err, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      setDnaError('Analysis failed — please try again.');
    },
  });

  const exportMyDataMutation = useMutation({
    mutationFn: exportMyData,
    // WHY: capture at mutate — skip download/toast if the user switched mid-export.
    onMutate: (): { mutateUserId: string } => ({ mutateUserId: clerkUserIdRef.current }),
    onSuccess: (data, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      downloadJsonExport(
        data,
        `pensieve-export-${new Date().toISOString().slice(0, 10)}.json`,
      );
      // WHY: surface server `warning` — export caps at 100 jobs / omits agent logs.
      if (data.warning) {
        flashToast(data.warning, false, data.truncated ? 6000 : 4000);
      } else {
        flashToast('Export downloaded.');
      }
    },
    onError: (_err, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      setExportError('Export failed — please try again.');
    },
  });

  const deleteMyAccountMutation = useMutation({
    mutationFn: deleteMyAccount,
    // WHY: capture at mutate — only signOut the account that requested delete.
    onMutate: (): { mutateUserId: string } => ({ mutateUserId: clerkUserIdRef.current }),
    onSuccess: (_data, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      void signOut({ redirectUrl: '/' });
    },
    onError: (_err, _vars, context) => {
      if (clerkUserIdRef.current !== (context?.mutateUserId ?? '')) return;
      setDeleteError('Failed to delete account — please try again.');
    },
  });

  // WHY: after mutations exist — reset DNA/export isPending UI on account switch.
  useBrandAccountReset({
    clerkUserId,
    setIsHydrated,
    setBrandName,
    setIndustry,
    setSelectedVoices,
    setPhrasesUse,
    setPhrasesAvoid,
    setContentDna,
    setDnaSamples,
    setDnaError,
    setSaveError,
    setExportError,
    setResetConfirming,
    setShowDeleteModal,
    setDeleteConfirmText,
    setDeleteError,
    setToast,
    toastTimerRef,
    resetMutations: () => {
      analyzeVoiceMutation.reset();
      exportMyDataMutation.reset();
      updateBrandVoiceMutation.reset();
    },
  });

  function handleAnalyzeDna() {
    if (!dnaSamples.trim() || dnaSamples.length < 50) {
      setDnaError('Please paste at least 50 characters of sample posts (3–5 posts works best).');
      return;
    }
    setDnaError('');
    analyzeVoiceMutation.mutate(dnaSamples);
  }

  function toggleVoice(voice: string) {
    // WHY: keep ≥1 selected: deselecting every pill saved `brandVoice: ""`, which
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

  // WHY: refetch saved profile (not blank defaults) — matches "Discard unsaved edits?".
  async function handleReset() {
    // WHY: no-op while save is pending — Reset mid-save raced the mutation.
    if (updateBrandVoiceMutation.isPending) return;
    if (!resetConfirming) {
      setResetConfirming(true);
      return;
    }
    setResetConfirming(false);
    // WHY: capture before refetch — applyProfileToForm must not paint User A's
    // profile onto User B's form if they switched mid-await.
    const resetUserId = clerkUserIdRef.current;
    try {
      const { data } = await profileQuery.refetch();
      if (clerkUserIdRef.current !== resetUserId) return;
      if (data) applyProfileToForm(data);
    } catch {
      if (clerkUserIdRef.current !== resetUserId) return;
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

  // WHY: profile that arrives after mount is copied before paint. Inputs stay
  // locked until that copy so a fast keystroke can't land in the blank form.
  // WHY: also unlock on terminal profile error — otherwise inputs stayed disabled
  // forever with empty defaults and no way to edit/save without a successful load.
  if (!isHydrated && profileQuery.data) {
    setIsHydrated(true);
    applyProfileToForm(profileQuery.data);
  } else if (!isHydrated && profileQuery.isError) {
    setIsHydrated(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{BRAND_STYLES}</style>

      <div className="section-header">
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>
          Brand Settings
        </h1>
        <p style={{ fontSize: 'clamp(12px,2vw,13px)', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Customize how AI writes content for your brand
        </p>
      </div>

      <div className="brand-card-grid">
        <IdentityCard
          brandName={brandName} onBrandNameChange={setBrandName}
          industry={industry} onIndustryChange={setIndustry}
          inputsDisabled={!isHydrated}
        />

        <VoiceCard
          selectedVoices={selectedVoices} onToggleVoice={toggleVoice}
          phrasesUse={phrasesUse} onPhrasesUseChange={setPhrasesUse}
          phrasesAvoid={phrasesAvoid} onPhrasesAvoidChange={setPhrasesAvoid}
          inputsDisabled={!isHydrated}
        />

        <VoiceDriftCard
          // WHY: isPending, not isLoading: while Clerk hydrates the query is disabled
          // and isLoading is false — that flashed the empty voice-consistency copy.
          isLoading={profileQuery.isPending}
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
          socialConnections={brandSocial.socialConnections}
          oauthConfigured={brandSocial.oauthConfigured}
          disconnectingPlatform={brandSocial.disconnectingPlatform}
          onDisconnect={(platform) => brandSocial.setDisconnectConfirm(platform)}
          onConnect={brandSocial.onConnect}
          connectingPlatform={brandSocial.connectingPlatform}
          isLoading={brandSocial.isLoading}
          isError={brandSocial.isError}
          onRetry={brandSocial.onRetry}
        />

        <DangerZoneCard
          exporting={exportMyDataMutation.isPending}
          exportError={exportError}
          onExport={handleExportData}
          onOpenDeleteModal={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(''); }}
        />
      </div>

      <BrandSaveBar
        resetConfirming={resetConfirming}
        onCancelReset={() => setResetConfirming(false)}
        onReset={() => { handleReset().catch(() => {}); }}
        onSave={handleSave}
        savePending={updateBrandVoiceMutation.isPending}
        saveDisabled={
          updateBrandVoiceMutation.isPending
          || !isHydrated
          // WHY: isPending — disabled gated query must keep Save off until hydrate.
          || profileQuery.isPending
        }
        saveTitle={
          profileQuery.isError
            ? 'Profile failed to load — saving will use what’s in the form (retry Voice Drift above to reload)'
            : !isHydrated || profileQuery.isPending
              ? 'Loading your saved brand…'
              : undefined
        }
        saveError={saveError}
      />

      {toast && (
        <div
          role="status"
          className={`toast ${toast.isError ? 'toast-error' : 'toast-success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {toast.isError ? <AlertCircle size={12} /> : <Check size={12} />}
          {toast.message}
        </div>
      )}

      {brandSocial.disconnectConfirm && (
        <ConfirmDeleteModal
          title={`Disconnect ${brandSocial.disconnectConfirm}?`}
          message="You'll need to reconnect before you can post to this account again."
          confirmLabel="Disconnect"
          pendingLabel="Disconnecting…"
          onCancel={() => brandSocial.setDisconnectConfirm(null)}
          onConfirm={brandSocial.handleConfirmDisconnect}
          isPending={brandSocial.disconnectPending}
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
